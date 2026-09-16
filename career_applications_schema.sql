-- MobileDoc career applications
CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL CHECK (specialty IN ('Medical Doctor', 'Nurse', 'Pharmacist', 'Lab Scientist')),
  hospital TEXT,
  experienced_in_digital_healthcare BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit career applications" ON public.career_applications;
DROP POLICY IF EXISTS "Admins can view career applications" ON public.career_applications;
DROP POLICY IF EXISTS "Admins can update career applications" ON public.career_applications;
DROP POLICY IF EXISTS "Admins can delete career applications" ON public.career_applications;

CREATE POLICY "Anyone can submit career applications"
  ON public.career_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view career applications"
  ON public.career_applications FOR SELECT
  USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');

CREATE POLICY "Admins can update career applications"
  ON public.career_applications FOR UPDATE
  USING (auth.jwt()->>'email' = 'admin@givehealthcare.com')
  WITH CHECK (auth.jwt()->>'email' = 'admin@givehealthcare.com');

CREATE POLICY "Admins can delete career applications"
  ON public.career_applications FOR DELETE
  USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');

CREATE INDEX IF NOT EXISTS career_applications_created_at_idx
  ON public.career_applications (created_at DESC);
