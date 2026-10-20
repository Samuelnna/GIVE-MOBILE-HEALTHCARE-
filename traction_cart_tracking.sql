-- Tracks additions, removals, and paid-order cart clearing separately.
BEGIN;
CREATE TABLE IF NOT EXISTS public.analytics_tracking_config (
  id TEXT PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.analytics_tracking_config(id) VALUES ('cart_additions') ON CONFLICT DO NOTHING;
INSERT INTO public.analytics_tracking_config(id) VALUES ('cart_removals') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.analytics_cart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  medication_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.analytics_cart_events ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'added';
ALTER TABLE public.analytics_cart_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_tracking_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_cart_events, public.analytics_tracking_config FROM anon, authenticated;
GRANT ALL ON public.analytics_cart_events, public.analytics_tracking_config TO service_role;
CREATE OR REPLACE FUNCTION public.track_cart_addition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed_units INTEGER; change_kind TEXT; event_user UUID; event_medication UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    changed_units := -OLD.quantity; event_user := OLD.user_id; event_medication := OLD.medication_id;
  ELSE
    event_user := NEW.user_id; event_medication := NEW.medication_id;
    IF TG_OP = 'INSERT' THEN changed_units := NEW.quantity;
    ELSE changed_units := NEW.quantity - OLD.quantity;
    END IF;
  END IF;
  IF changed_units <> 0 THEN
    IF changed_units > 0 THEN change_kind := 'added';
    ELSIF current_setting('app.cart_change_kind', TRUE) = 'checkout_cleared' THEN change_kind := 'checkout_cleared';
    ELSE change_kind := 'removed'; END IF;
    INSERT INTO public.analytics_cart_events(user_id, medication_id, quantity, event_type)
    VALUES (event_user, event_medication, ABS(changed_units), change_kind);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_cart_addition() FROM PUBLIC;
DROP TRIGGER IF EXISTS track_cart_addition ON public.cart_items;
CREATE TRIGGER track_cart_addition AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.track_cart_addition();

-- Checkout clearing is its own event; it is not a customer removal.
CREATE OR REPLACE FUNCTION public.clear_paid_order_cart(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE order_patient UUID; order_status TEXT; item RECORD; previous_kind TEXT;
BEGIN
  SELECT patient_id, status INTO order_patient, order_status
  FROM public.pharmacy_orders WHERE id = p_order_id FOR UPDATE;
  IF auth.uid() IS NULL OR order_patient IS DISTINCT FROM auth.uid() OR LOWER(COALESCE(order_status, '')) <> 'paid' THEN
    RAISE EXCEPTION 'A paid order belonging to your account is required';
  END IF;
  -- Prevent repeated calls from clearing items added after the purchase.
  IF EXISTS (SELECT 1 FROM public.analytics_tracking_config WHERE id = 'cleared_order:' || p_order_id::TEXT) THEN RETURN; END IF;
  previous_kind := current_setting('app.cart_change_kind', TRUE);
  PERFORM set_config('app.cart_change_kind', 'checkout_cleared', TRUE);
  FOR item IN SELECT medication_id, SUM(quantity) AS quantity FROM public.pharmacy_order_items
    WHERE order_id = p_order_id GROUP BY medication_id
  LOOP
    PERFORM 1 FROM public.cart_items WHERE user_id = order_patient AND medication_id = item.medication_id FOR UPDATE;
    DELETE FROM public.cart_items WHERE user_id = order_patient AND medication_id = item.medication_id AND quantity <= item.quantity;
    UPDATE public.cart_items SET quantity = quantity - item.quantity
      WHERE user_id = order_patient AND medication_id = item.medication_id AND quantity > item.quantity;
  END LOOP;
  INSERT INTO public.analytics_tracking_config(id) VALUES ('cleared_order:' || p_order_id::TEXT);
  PERFORM set_config('app.cart_change_kind', COALESCE(previous_kind, ''), TRUE);
END; $$;
REVOKE ALL ON FUNCTION public.clear_paid_order_cart(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_paid_order_cart(UUID) TO authenticated;
COMMIT;
