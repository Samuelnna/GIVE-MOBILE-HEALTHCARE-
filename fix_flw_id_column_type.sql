-- Flutterwave transaction IDs can exceed BIGINT; store them losslessly as text.
ALTER TABLE public.payments
  ALTER COLUMN flw_id TYPE TEXT USING flw_id::TEXT;
