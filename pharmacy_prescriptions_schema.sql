-- Prescription uploads submitted through the MobileDoc e-pharmacy
CREATE TABLE IF NOT EXISTS public.pharmacy_prescription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pharmacy_prescription_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can submit prescription requests" ON public.pharmacy_prescription_requests;
DROP POLICY IF EXISTS "Patients can view their prescription requests" ON public.pharmacy_prescription_requests;
DROP POLICY IF EXISTS "Admins can manage prescription requests" ON public.pharmacy_prescription_requests;

CREATE POLICY "Patients can submit prescription requests"
  ON public.pharmacy_prescription_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can view their prescription requests"
  ON public.pharmacy_prescription_requests FOR SELECT
  USING (auth.uid() = patient_id OR auth.jwt()->>'email' = 'admin@givehealthcare.com');

CREATE POLICY "Admins can manage prescription requests"
  ON public.pharmacy_prescription_requests FOR UPDATE
  USING (auth.jwt()->>'email' = 'admin@givehealthcare.com')
  WITH CHECK (auth.jwt()->>'email' = 'admin@givehealthcare.com');

INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-prescriptions', 'pharmacy-prescriptions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Patients upload pharmacy prescriptions" ON storage.objects;
DROP POLICY IF EXISTS "Patients view pharmacy prescriptions" ON storage.objects;
DROP POLICY IF EXISTS "Admins view pharmacy prescriptions" ON storage.objects;

CREATE POLICY "Patients upload pharmacy prescriptions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pharmacy-prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Patients view pharmacy prescriptions"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pharmacy-prescriptions' AND ((storage.foldername(name))[1] = auth.uid()::text OR auth.jwt()->>'email' = 'admin@givehealthcare.com'));

CREATE POLICY "Admins view pharmacy prescriptions"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pharmacy-prescriptions' AND auth.jwt()->>'email' = 'admin@givehealthcare.com');
