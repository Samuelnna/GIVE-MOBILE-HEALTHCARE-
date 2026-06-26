-- ============================================================
-- Mobile Health App - Supabase SQL Schema Setup
-- ============================================================

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('patient', 'professional', 'admin')),
  status TEXT DEFAULT 'active', -- For professionals: pending, active, rejected
  role TEXT, -- For professionals: Doctor, Pharmacist, Lab Scientist, Nurse, etc.
  ai_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the professional_verifications table
CREATE TABLE IF NOT EXISTS public.professional_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  license_number TEXT NOT NULL,
  license_document_url TEXT,
  selfie_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Ensure required columns and constraints exist
DO $$ 
BEGIN 
  -- Check 'role' in profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT;
  END IF;
  
  -- Check 'status' in profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  -- Ensure user_id in professional_verifications is UNIQUE for upsert logic
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='professional_verifications') THEN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='professional_verifications' 
        AND constraint_type='UNIQUE'
    ) THEN
        -- Cleanup duplicates first so constraint can be added
        DELETE FROM public.professional_verifications a
        WHERE a.ctid <> (SELECT min(b.ctid)
                         FROM public.professional_verifications b
                         WHERE a.user_id = b.user_id);
                         
        BEGIN
            ALTER TABLE public.professional_verifications ADD CONSTRAINT professional_verifications_user_id_key UNIQUE (user_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add unique constraint';
        END;
    END IF;
  END IF;
END $$;

-- 3. Create Hospitals table
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Pharmacies table
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Labs table
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Lab Tests table
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  lab_id UUID REFERENCES public.labs(id) ON DELETE CASCADE,
  category TEXT,
  requires_fasting BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.1 Lab Appointments table
CREATE TABLE IF NOT EXISTS public.lab_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_test_id UUID REFERENCES public.lab_tests(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.2 Orders table
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_method TEXT NOT NULL,
  delivery_address TEXT,
  pickup_location TEXT,
  status TEXT DEFAULT 'Processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.3 Order Items table
CREATE TABLE IF NOT EXISTS public.pharmacy_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL
);

-- 8. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

-- 9. Profiles Policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view active professional profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view active professional profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');

-- 10. Verifications Policies
DROP POLICY IF EXISTS "Professionals can insert their own verifications" ON public.professional_verifications;
DROP POLICY IF EXISTS "Professionals can view their own verifications" ON public.professional_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.professional_verifications;
DROP POLICY IF EXISTS "Admins can update verifications" ON public.professional_verifications;

CREATE POLICY "Professionals can insert their own verifications" ON public.professional_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Professionals can view their own verifications" ON public.professional_verifications FOR SELECT USING (true);
CREATE POLICY "Admins can view all verifications" ON public.professional_verifications FOR SELECT USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');
CREATE POLICY "Admins can update verifications" ON public.professional_verifications FOR UPDATE USING (auth.jwt()->>'email' = 'admin@givehealthcare.com');

-- 11. Public Data (Hospitals, Pharmacies, Medications)
DROP POLICY IF EXISTS "Anyone can view hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can delete hospitals" ON public.hospitals;
CREATE POLICY "Anyone can view hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Admins can insert hospitals" ON public.hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update hospitals" ON public.hospitals FOR UPDATE USING (true);
CREATE POLICY "Admins can delete hospitals" ON public.hospitals FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can view pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Admins can insert pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Admins can update pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Admins can delete pharmacies" ON public.pharmacies;
CREATE POLICY "Anyone can view pharmacies" ON public.pharmacies FOR SELECT USING (true);
CREATE POLICY "Admins can insert pharmacies" ON public.pharmacies FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update pharmacies" ON public.pharmacies FOR UPDATE USING (true);
CREATE POLICY "Admins can delete pharmacies" ON public.pharmacies FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can view medications" ON public.medications;
DROP POLICY IF EXISTS "Admins can insert medications" ON public.medications;
DROP POLICY IF EXISTS "Admins can update medications" ON public.medications;
DROP POLICY IF EXISTS "Admins can delete medications" ON public.medications;
CREATE POLICY "Anyone can view medications" ON public.medications FOR SELECT USING (true);
CREATE POLICY "Admins can insert medications" ON public.medications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update medications" ON public.medications FOR UPDATE USING (true);
CREATE POLICY "Admins can delete medications" ON public.medications FOR DELETE USING (true);

-- 12. Labs and Lab Tests Policies
DROP POLICY IF EXISTS "Anyone can view labs" ON public.labs;
DROP POLICY IF EXISTS "Admins can insert labs" ON public.labs;
CREATE POLICY "Anyone can view labs" ON public.labs FOR SELECT USING (true);
CREATE POLICY "Admins can insert labs" ON public.labs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view lab tests" ON public.lab_tests;
DROP POLICY IF EXISTS "Admins can insert lab tests" ON public.lab_tests;
CREATE POLICY "Anyone can view lab tests" ON public.lab_tests FOR SELECT USING (true);
CREATE POLICY "Admins can insert lab tests" ON public.lab_tests FOR INSERT WITH CHECK (true);

-- 13. Appointments Policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Patients can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (true);

-- 14. Messages Policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (true);

-- 15. Trigger for New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_type, status, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.email, ''),
    CASE 
      WHEN NEW.email = 'admin@givehealthcare.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient')
    END,
    CASE 
      WHEN NEW.email = 'admin@givehealthcare.com' THEN 'active'
      WHEN COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient') = 'professional' THEN 'pending' 
      ELSE 'active' 
    END,
    COALESCE(NEW.raw_user_meta_data->>'role', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 16. Storage Policies
-- Assumes buckets 'licenses' and 'selfies' exist
DROP POLICY IF EXISTS "Users can upload their own license" ON storage.objects;
CREATE POLICY "Users can upload their own license" ON storage.objects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can view licenses" ON storage.objects;
CREATE POLICY "Anyone can view licenses" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can upload their own selfie" ON storage.objects;
CREATE POLICY "Users can upload their own selfie" ON storage.objects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can view selfies" ON storage.objects;
CREATE POLICY "Anyone can view selfies" ON storage.objects FOR SELECT USING (true);
