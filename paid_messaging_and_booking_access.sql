-- Run in Supabase SQL Editor. Applies to every patient/professional pair,
-- including pharmacists, nurses, and lab scientists. Medicine purchases alone
-- do not unlock consultations with an individual professional.
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

CREATE OR REPLACE FUNCTION public.can_book_paid_consultation(patient UUID, professional UUID, payment UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = patient AND EXISTS (
    SELECT 1 FROM public.payments p JOIN public.profiles provider ON provider.id = professional
    WHERE p.id = payment AND p.user_id = patient
      AND provider.user_type = 'professional' AND provider.status = 'active'
      AND p.payment_type IN ('doctor_consultation', 'professional_consultation')
      AND LOWER(p.status) IN ('successful', 'completed') AND p.amount > 0
      AND (p.details->>'professional_id' = professional::TEXT OR p.details->>'doctor_id' = professional::TEXT)
  );
$$;
REVOKE ALL ON FUNCTION public.can_book_paid_consultation(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_book_paid_consultation(UUID, UUID, UUID) TO authenticated;

-- Policies combine with OR, so remove all old policies on these two tables
-- before installing the complete participant-based policy set.
DO $$ DECLARE policy RECORD; BEGIN
  FOR policy IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('messages', 'appointments')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', policy.policyname, policy.tablename); END LOOP;
END; $$;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paid participants can read messages" ON public.messages FOR SELECT TO authenticated
USING ((sender_id = auth.uid() OR receiver_id = auth.uid())
       AND public.can_message_participants(sender_id, receiver_id));
CREATE POLICY "Paid participants can send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_message_participants(sender_id, receiver_id));

CREATE POLICY "Participants and admins can read appointments" ON public.appointments FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR public.payment_viewer_is_admin());
CREATE POLICY "Patients can book paid consultations" ON public.appointments FOR INSERT TO authenticated
WITH CHECK (patient_id = auth.uid() AND status = 'Pending'
            AND public.can_book_paid_consultation(patient_id, doctor_id, payment_id));
CREATE POLICY "Participants and admins can update appointments" ON public.appointments FOR UPDATE TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR public.payment_viewer_is_admin())
WITH CHECK (patient_id = auth.uid() OR doctor_id = auth.uid() OR public.payment_viewer_is_admin());

CREATE OR REPLACE FUNCTION public.protect_appointment_participants()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.payment_viewer_is_admin() THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'Appointment participants and booking details cannot be changed';
    END IF;
    IF auth.uid() = OLD.doctor_id THEN
      IF NOT ((OLD.status = 'Pending' AND NEW.status IN ('Upcoming', 'Cancelled'))
           OR (OLD.status = 'Upcoming' AND NEW.status IN ('Completed', 'Cancelled'))
           OR NEW.status = OLD.status) THEN RAISE EXCEPTION 'Invalid appointment status change'; END IF;
    ELSIF auth.uid() = OLD.patient_id THEN
      IF NEW.status IS DISTINCT FROM OLD.status AND
         NOT (OLD.status IN ('Pending', 'Upcoming') AND NEW.status = 'Cancelled') THEN
        RAISE EXCEPTION 'Only the assigned professional can accept or complete a booking';
      END IF;
    ELSE RAISE EXCEPTION 'This appointment belongs to another account'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_appointment_participants ON public.appointments;
CREATE TRIGGER protect_appointment_participants BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.protect_appointment_participants();
COMMIT;
