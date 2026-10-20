-- Adds customer receipt confirmation without changing checkout/payment policies.
BEGIN;
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS receipt_status TEXT NOT NULL DEFAULT 'awaiting_confirmation',
  ADD COLUMN IF NOT EXISTS receipt_updated_at TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pharmacy_orders'::regclass AND conname = 'pharmacy_order_receipt_status_check') THEN
    ALTER TABLE public.pharmacy_orders ADD CONSTRAINT pharmacy_order_receipt_status_check
      CHECK (receipt_status IN ('awaiting_confirmation', 'received', 'not_received'));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND
     NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pharmacy_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_orders;
  END IF;
END; $$;
COMMIT;
