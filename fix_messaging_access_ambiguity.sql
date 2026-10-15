-- Fix the ambiguous variable in messaging access. Does not change policies or payments.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_message_participants(message_sender UUID, message_receiver UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender_type TEXT; v_receiver_type TEXT; v_patient_id UUID; v_professional_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() NOT IN (message_sender, message_receiver)
     OR message_sender IS NULL OR message_receiver IS NULL THEN RETURN FALSE; END IF;
  SELECT profile.user_type INTO v_sender_type FROM public.profiles profile WHERE profile.id = message_sender;
  SELECT profile.user_type INTO v_receiver_type FROM public.profiles profile WHERE profile.id = message_receiver;
  IF v_sender_type IS NULL OR v_receiver_type IS NULL THEN RETURN FALSE; END IF;
  IF v_sender_type = 'patient' AND v_receiver_type = 'professional' THEN
    v_patient_id := message_sender; v_professional_id := message_receiver;
  ELSIF v_receiver_type = 'patient' AND v_sender_type = 'professional' THEN
    v_patient_id := message_receiver; v_professional_id := message_sender;
  ELSE RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.payments p WHERE p.user_id = v_patient_id
      AND p.payment_type IN ('doctor_consultation', 'professional_consultation')
      AND LOWER(p.status) IN ('successful', 'completed') AND p.amount > 0
      AND (p.details->>'professional_id' = v_professional_id::TEXT
           OR p.details->>'doctor_id' = v_professional_id::TEXT
           OR EXISTS (SELECT 1 FROM public.appointments a
                      WHERE a.payment_id = p.id AND a.patient_id = v_patient_id
                        AND a.doctor_id = v_professional_id))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.can_message_participants(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_message_participants(UUID, UUID) TO authenticated;

COMMIT;

