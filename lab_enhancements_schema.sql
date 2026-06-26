
-- ============================================================
-- Lab Enhancements Schema
-- ============================================================

-- 1. Update referrals to support lab_id
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE;
-- Also allow hospital_id to be null if lab_id is set
ALTER TABLE public.referrals ALTER COLUMN hospital_id DROP NOT NULL;

-- 2. Create Lab Results table
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

-- 3. Enable RLS
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Lab Results
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

-- 5. Storage Bucket for Lab Reports
-- Note: Create 'lab-reports' bucket in Supabase Dashboard and set to Private or Public as needed.
-- Policy for viewing (Patient & Admin)
DROP POLICY IF EXISTS "Authorized users can view lab reports" ON storage.objects;
CREATE POLICY "Authorized users can view lab reports" ON storage.objects FOR SELECT 
USING (bucket_id = 'lab-reports' AND (auth.uid() = owner OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
)));

DROP POLICY IF EXISTS "Admins can upload lab reports" ON storage.objects;
CREATE POLICY "Admins can upload lab reports" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'lab-reports' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
));
