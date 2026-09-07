
-- STEP 1: Cleanup ALL duplicate slots across all booking tables

-- Clean Doctors Appointments
DELETE FROM public.appointments a
WHERE a.ctid <> (SELECT min(b.ctid) FROM public.appointments b
                 WHERE a.doctor_id = b.doctor_id AND a.date = b.date AND a.time = b.time);

-- Clean Lab Appointments
DELETE FROM public.lab_appointments a
WHERE a.ctid <> (SELECT min(b.ctid) FROM public.lab_appointments b
                 WHERE a.lab_id = b.lab_id AND a.date = b.date AND a.time = b.time);

-- Clean Hospital Appointments
DELETE FROM public.hospital_appointments a
WHERE a.ctid <> (SELECT min(b.ctid) FROM public.hospital_appointments b
                 WHERE a.hospital_id = b.hospital_id AND a.date = b.date AND a.time = b.time);


-- STEP 2: Now apply the unique constraints securely
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_appointment_slot') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT unique_appointment_slot UNIQUE (doctor_id, date, time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_lab_slot') THEN
    ALTER TABLE public.lab_appointments ADD CONSTRAINT unique_lab_slot UNIQUE (lab_id, date, time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_hospital_slot') THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT unique_hospital_slot UNIQUE (hospital_id, date, time);
  END IF;
END $$;


-- STEP 3: Ensure Pharmacy delivery tracking exists
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending'; 

-- Notify Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';
