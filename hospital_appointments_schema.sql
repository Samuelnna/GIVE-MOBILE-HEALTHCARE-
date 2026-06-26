
-- ============================================================
-- Hospital Appointments Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hospital_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.hospital_appointments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own hospital appointments" ON public.hospital_appointments;
CREATE POLICY "Users can view their own hospital appointments" ON public.hospital_appointments 
FOR SELECT USING (auth.uid() = patient_id OR EXISTS (
    SELECT 1 FROM public.referrals r WHERE r.id = referral_id AND r.doctor_id = auth.uid()
));

DROP POLICY IF EXISTS "Patients can insert hospital appointments" ON public.hospital_appointments;
CREATE POLICY "Patients can insert hospital appointments" ON public.hospital_appointments 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage hospital appointments" ON public.hospital_appointments;
CREATE POLICY "Admins can manage hospital appointments" ON public.hospital_appointments 
FOR ALL USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');
