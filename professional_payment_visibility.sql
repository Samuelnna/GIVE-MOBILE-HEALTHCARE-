-- Add professional payment visibility for doctor, pharmacist, nurse, and other
-- consultation bookings. Matches text IDs without unsafe UUID casts.
BEGIN;
DROP POLICY IF EXISTS "Professionals can view relevant payments" ON public.payments;
CREATE POLICY "Professionals can view relevant payments"
ON public.payments FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR details->>'professional_id' = auth.uid()::TEXT
  OR details->>'doctor_id' = auth.uid()::TEXT
);
COMMIT;

-- Inspect the live policies needed for professional acceptance and patient chat.
-- These results are needed before changing unrelated database permissions.
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('appointments', 'messages', 'pharmacy_orders', 'pharmacy_order_items')
ORDER BY tablename, policyname;
