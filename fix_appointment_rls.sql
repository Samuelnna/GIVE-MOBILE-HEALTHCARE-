
-- ============================================================
-- FIX: Lab and Hospital Appointment Policies
-- ============================================================

-- 1. Ensure lab_appointments has permissive policies
ALTER TABLE public.lab_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view lab appointments" ON public.lab_appointments;
CREATE POLICY "Anyone can view lab appointments" ON public.lab_appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Patients can insert lab appointments" ON public.lab_appointments;
CREATE POLICY "Patients can insert lab appointments" ON public.lab_appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update lab appointments" ON public.lab_appointments;
CREATE POLICY "Users can update lab appointments" ON public.lab_appointments FOR UPDATE USING (true);

-- 2. Ensure health_topics is accessible (re-verification)
ALTER TABLE public.health_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view health topics" ON public.health_topics;
CREATE POLICY "Anyone can view health topics" ON public.health_topics FOR SELECT USING (true);

-- 3. Ensure referrals table has permissive policies for status updates
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referrals" ON public.referrals;
CREATE POLICY "Anyone can view referrals" ON public.referrals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update referrals" ON public.referrals;
CREATE POLICY "Anyone can update referrals" ON public.referrals FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;
CREATE POLICY "Anyone can insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);
