-- Apply before enabling pharmacy checkout from the Expo app. No existing data is deleted.
BEGIN;
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS mobile_payment_id UUID REFERENCES public.payments(id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_orders_mobile_payment_unique ON public.pharmacy_orders(mobile_payment_id) WHERE mobile_payment_id IS NOT NULL;
-- One consultation payment can create only one appointment, including concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_payment_once ON public.appointments(payment_id) WHERE payment_id IS NOT NULL;

-- Older web deployments may have permissive payment write policies. Mobile
-- checkout rows must remain immutable to clients after server-side pricing.
CREATE OR REPLACE FUNCTION public.protect_mobile_pharmacy_payments()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(),'') IN ('anon','authenticated') THEN
    IF TG_OP <> 'INSERT' THEN
      IF OLD.tx_ref LIKE 'MOB-%' OR OLD.details->>'mobile_checkout' = '1' THEN
        RAISE EXCEPTION 'Mobile checkout payments must be managed by the server';
      END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      IF NEW.tx_ref LIKE 'MOB-%' OR NEW.details->>'mobile_checkout' = '1' THEN
        RAISE EXCEPTION 'Mobile checkout payments must be managed by the server';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_mobile_pharmacy_payments ON public.payments;
CREATE TRIGGER protect_mobile_pharmacy_payments BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.protect_mobile_pharmacy_payments();

CREATE OR REPLACE FUNCTION public.complete_mobile_pharmacy_order(payment_reference TEXT, owner_id UUID, gateway_id TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments%ROWTYPE; order_id UUID; item JSONB;
BEGIN
  SELECT * INTO p FROM public.payments WHERE tx_ref = payment_reference AND user_id = owner_id FOR UPDATE;
  IF NOT FOUND OR p.payment_type <> 'pharmacy_order' OR (p.details->>'mobile_checkout') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Invalid mobile payment'; END IF;
  SELECT id INTO order_id FROM public.pharmacy_orders WHERE mobile_payment_id = p.id;
  IF order_id IS NOT NULL THEN RETURN order_id; END IF;
  INSERT INTO public.pharmacy_orders(patient_id,total_amount,delivery_method,delivery_address,pickup_location,delivery_phone,status,fulfillment_status,mobile_payment_id)
  VALUES(owner_id,p.amount,p.details->>'delivery_method',p.details->>'delivery_address',p.details->>'pickup_location',p.details->>'delivery_phone','Paid','pending',p.id) RETURNING id INTO order_id;
  FOR item IN SELECT * FROM jsonb_array_elements(p.details->'items') LOOP
    INSERT INTO public.pharmacy_order_items(order_id,medication_id,quantity,price_at_time)
    VALUES(order_id,(item->>'medication_id')::UUID,(item->>'quantity')::INTEGER,(item->>'price_at_time')::NUMERIC);
  END LOOP;
  UPDATE public.payments SET status='successful',flw_id=gateway_id WHERE id=p.id;
  DELETE FROM public.cart_items WHERE user_id=owner_id;
  RETURN order_id;
END $$;
REVOKE ALL ON FUNCTION public.complete_mobile_pharmacy_order(TEXT,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_mobile_pharmacy_order(TEXT,UUID,TEXT) TO service_role;
COMMIT;
