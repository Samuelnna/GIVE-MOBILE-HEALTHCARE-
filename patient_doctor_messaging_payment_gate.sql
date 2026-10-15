CREATE OR REPLACE FUNCTION public.can_message_participants(message_sender UUID, message_receiver UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_type TEXT;
  receiver_type TEXT;
  sender_role TEXT;
  receiver_role TEXT;
  sender_specialty TEXT;
  receiver_specialty TEXT;
  patient_id UUID;
  doctor_id UUID;
  doctor_profile_text TEXT;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> message_sender AND auth.uid() <> message_receiver) THEN
    RETURN FALSE;
  END IF;

  SELECT user_type, role, specialty
  INTO sender_type, sender_role, sender_specialty
  FROM public.profiles
  WHERE id = message_sender;

  SELECT user_type, role, specialty
  INTO receiver_type, receiver_role, receiver_specialty
  FROM public.profiles
  WHERE id = message_receiver;

  IF sender_type IS NULL OR receiver_type IS NULL THEN
    RETURN FALSE;
  END IF;

  IF sender_type = 'patient' AND receiver_type = 'professional' THEN
    patient_id := message_sender;
    doctor_id := message_receiver;
    doctor_profile_text := COALESCE(receiver_role, '') || ' ' || COALESCE(receiver_specialty, '');
  ELSIF receiver_type = 'patient' AND sender_type = 'professional' THEN
    patient_id := message_receiver;
    doctor_id := message_sender;
    doctor_profile_text := COALESCE(sender_role, '') || ' ' || COALESCE(sender_specialty, '');
  ELSE
    RETURN TRUE;
  END IF;

  IF doctor_profile_text !~* '(doctor|physician|surgeon|consultant|general practitioner|gp|cardiologist|neurologist|pediatrician|dentist|specialist)' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.user_id = patient_id
      AND payment.payment_type IN ('doctor_consultation', 'professional_consultation')
      AND LOWER(payment.status) IN ('successful', 'completed')
      AND payment.amount > 0
      AND (
        payment.details ->> 'doctor_id' = doctor_id::TEXT OR
        payment.details ->> 'professional_id' = doctor_id::TEXT
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_message_participants(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_message_participants(UUID, UUID) TO authenticated;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS flw_id TEXT;
ALTER TABLE public.payments
  ALTER COLUMN flw_id TYPE TEXT USING flw_id::TEXT;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can view eligible messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send eligible messages" ON public.messages;

CREATE POLICY "Participants can view eligible messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND public.can_message_participants(sender_id, receiver_id)
);

CREATE POLICY "Participants can send eligible messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.can_message_participants(sender_id, receiver_id)
);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert non-consultation payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND payment_type <> 'doctor_consultation'
);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update non-consultation payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND payment_type <> 'doctor_consultation'
)
WITH CHECK (
  auth.uid() = user_id
  AND payment_type <> 'doctor_consultation'
);
