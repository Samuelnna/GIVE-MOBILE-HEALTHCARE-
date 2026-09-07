
-- STEP 1: Cleanup duplicate appointments to allow unique constraint
DELETE FROM public.appointments a
WHERE a.ctid <> (SELECT min(b.ctid)
                 FROM public.appointments b
                 WHERE a.doctor_id = b.doctor_id 
                 AND a.date = b.date 
                 AND a.time = b.time);

-- STEP 2: Now apply the unique constraints
ALTER TABLE public.appointments ADD CONSTRAINT unique_appointment_slot UNIQUE (doctor_id, date, time);
ALTER TABLE public.lab_appointments ADD CONSTRAINT unique_lab_slot UNIQUE (lab_id, date, time);
ALTER TABLE public.hospital_appointments ADD CONSTRAINT unique_hospital_slot UNIQUE (hospital_id, date, time);

-- STEP 3: Harden Pharmacy Orders with detailed delivery tracking
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending'; 

-- Notify Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';
