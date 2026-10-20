-- Optional: measures future cart additions. Does not change cart or payment flow.
BEGIN;
CREATE TABLE IF NOT EXISTS public.analytics_tracking_config (
  id TEXT PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.analytics_tracking_config(id) VALUES ('cart_additions') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.analytics_cart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  medication_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.analytics_cart_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_tracking_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_cart_events, public.analytics_tracking_config FROM anon, authenticated;
GRANT ALL ON public.analytics_cart_events, public.analytics_tracking_config TO service_role;
CREATE OR REPLACE FUNCTION public.track_cart_addition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE added_units INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN added_units := NEW.quantity;
  ELSE added_units := NEW.quantity - OLD.quantity;
  END IF;
  IF added_units > 0 THEN
    INSERT INTO public.analytics_cart_events(user_id, medication_id, quantity)
    VALUES (NEW.user_id, NEW.medication_id, added_units);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_cart_addition() FROM PUBLIC;
DROP TRIGGER IF EXISTS track_cart_addition ON public.cart_items;
CREATE TRIGGER track_cart_addition AFTER INSERT OR UPDATE OF quantity ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.track_cart_addition();
COMMIT;
