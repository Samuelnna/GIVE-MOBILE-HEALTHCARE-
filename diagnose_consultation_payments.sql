-- Read-only checks. Run in the Supabase SQL Editor for the app's project.
-- 1. Confirm the columns used by the consultation payment insert exist.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments'
ORDER BY ordinal_position;

-- 2. Find constraints that could reject consultation payments.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass;

-- 3. Check whether consultations actually reach the database.
SELECT payment_type, status, COUNT(*) AS payment_count, MAX(created_at) AS latest_payment
FROM public.payments
GROUP BY payment_type, status
ORDER BY latest_payment DESC;

-- 4. Inspect payment access policies without changing them.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'payments';
