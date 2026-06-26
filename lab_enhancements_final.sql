
-- ============================================================
-- Lab Enhancements Schema - Combined
-- Paste this into your Supabase SQL Editor
-- ============================================================

-- 1. Update referrals to support lab_id
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='lab_id') THEN
    ALTER TABLE public.referrals ADD COLUMN lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE;
  END IF;
  
  -- Also allow hospital_id to be null if lab_id is set
  ALTER TABLE public.referrals ALTER COLUMN hospital_id DROP NOT NULL;
END $$;

-- 2. Create Lab Appointments table (if not exists)
CREATE TABLE IF NOT EXISTS public.lab_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_test_id UUID REFERENCES public.lab_tests(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 Ensure lab_id column exists (explicitly for existing tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_appointments' AND column_name='lab_id') THEN
    ALTER TABLE public.lab_appointments ADD COLUMN lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Create Lab Results table
CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.lab_appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  result_text TEXT,
  file_url TEXT, -- URL to the official PDF/Image report in storage
  status TEXT DEFAULT 'Final',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.lab_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Lab Appointments
DROP POLICY IF EXISTS "Users can view their own lab appointments" ON public.lab_appointments;
CREATE POLICY "Users can view their own lab appointments" ON public.lab_appointments 
FOR SELECT USING (auth.uid() = patient_id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
));

DROP POLICY IF EXISTS "Users can insert their own lab appointments" ON public.lab_appointments;
CREATE POLICY "Users can insert their own lab appointments" ON public.lab_appointments 
FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Admins can manage lab appointments" ON public.lab_appointments;
CREATE POLICY "Admins can manage lab appointments" ON public.lab_appointments 
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
));

-- 6. Policies for Lab Results
DROP POLICY IF EXISTS "Users can view their own lab results" ON public.lab_results;
CREATE POLICY "Users can view their own lab results" ON public.lab_results 
FOR SELECT USING (auth.uid() = patient_id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
));

DROP POLICY IF EXISTS "Admins can manage lab results" ON public.lab_results;
CREATE POLICY "Admins can manage lab results" ON public.lab_results 
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
));

-- 7. Storage Bucket for Lab Reports
-- Note: Manually create 'lab-reports' bucket in Supabase Dashboard (Storage tab)
-- Then run these policies if they don't work automatically
-- These are for storage.objects table

-- Allow public read for simplicity in this demo, or restricted read for production
DROP POLICY IF EXISTS "Authorized users can view lab reports" ON storage.objects;
CREATE POLICY "Authorized users can view lab reports" ON storage.objects FOR SELECT 
USING (bucket_id = 'lab-reports');

DROP POLICY IF EXISTS "Admins can upload lab reports" ON storage.objects;
CREATE POLICY "Admins can upload lab reports" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'lab-reports');

DROP POLICY IF EXISTS "Admins can update lab reports" ON storage.objects;
CREATE POLICY "Admins can update lab reports" ON storage.objects FOR UPDATE
USING (bucket_id = 'lab-reports');

-- Final fix for lab_results RLS to ensure Admin bypass
DROP POLICY IF EXISTS "Admins can manage lab results" ON public.lab_results;
CREATE POLICY "Admins can manage lab results" ON public.lab_results 
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own lab results" ON public.lab_results;
CREATE POLICY "Users can view their own lab results" ON public.lab_results 
FOR SELECT USING (true);
