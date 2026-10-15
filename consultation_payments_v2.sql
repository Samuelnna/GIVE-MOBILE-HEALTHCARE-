-- Run once in the app project's Supabase SQL Editor before using v2 checkout.
BEGIN;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS flw_id TEXT;
ALTER TABLE public.payments ALTER COLUMN flw_id TYPE TEXT USING flw_id::TEXT;

-- A reference identifies exactly one payment. Fails safely if duplicates exist.
CREATE UNIQUE INDEX IF NOT EXISTS payments_tx_ref_v2_unique ON public.payments(tx_ref);

-- Protect consultation records even if an older permissive RLS policy remains.
-- Only the service-role server may create, change, or delete consultation rows.
CREATE OR REPLACE FUNCTION public.protect_consultation_payments()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF TG_OP <> 'INSERT' THEN
      IF OLD.payment_type IN ('doctor_consultation', 'professional_consultation') THEN
        RAISE EXCEPTION 'Consultation payments must be managed by the payment server';
      END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      IF NEW.payment_type IN ('doctor_consultation', 'professional_consultation') THEN
        RAISE EXCEPTION 'Consultation payments must be managed by the payment server';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_consultation_payments ON public.payments;
CREATE TRIGGER protect_consultation_payments BEFORE INSERT OR UPDATE OR DELETE
ON public.payments FOR EACH ROW EXECUTE FUNCTION public.protect_consultation_payments();

CREATE OR REPLACE FUNCTION public.payment_viewer_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin');
$$;
REVOKE ALL ON FUNCTION public.payment_viewer_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_viewer_is_admin() TO authenticated;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT TO authenticated
USING (public.payment_viewer_is_admin());
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT TO authenticated
USING (auth.uid() = user_id);
COMMIT;
