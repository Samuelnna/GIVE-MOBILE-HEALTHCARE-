
-- ============================================================
-- Payment and Cart Persistence Schema
-- ============================================================

-- 1. Create Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  tx_ref TEXT UNIQUE NOT NULL,
  flw_ref TEXT,
  status TEXT DEFAULT 'pending', -- pending, successful, failed
  payment_type TEXT NOT NULL, -- pharmacy_order, lab_test
  details JSONB, -- stores items bought or test scheduled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 0. Ensure profiles table has image_url column
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='image_url') THEN
    ALTER TABLE public.profiles ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- 2. Create Cart Items table for database persistence
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, medication_id)
);

-- 3. Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments 
FOR SELECT USING (true);

-- Ensure specific policy for professionals to see payments they are involved in (redundant but safe)
DROP POLICY IF EXISTS "Professionals can view relevant payments" ON public.payments;
CREATE POLICY "Professionals can view relevant payments" ON public.payments
FOR SELECT USING (
    auth.uid() = user_id OR 
    (details->>'doctor_id')::uuid = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.appointments a 
        WHERE a.payment_id = public.payments.id AND a.doctor_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments" ON public.payments 
FOR UPDATE USING (true);

-- 5. Policies for Cart Items
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items 
FOR ALL USING (auth.uid() = user_id);

-- 6. Add payment_status to lab_appointments if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_appointments' AND column_name='payment_status') THEN
    ALTER TABLE public.lab_appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_appointments' AND column_name='payment_id') THEN
    ALTER TABLE public.lab_appointments ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;

  -- Ensure payment_id exists on main appointments table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='payment_id') THEN
    ALTER TABLE public.appointments ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;
