
-- Harden Pharmacy Orders with detailed delivery tracking
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending'; -- pending, dispatched, delivered

-- Add slot blocking to prevent double-bookings
ALTER TABLE public.appointments ADD CONSTRAINT unique_appointment_slot UNIQUE (doctor_id, date, time);
ALTER TABLE public.lab_appointments ADD CONSTRAINT unique_lab_slot UNIQUE (lab_id, date, time);
ALTER TABLE public.hospital_appointments ADD CONSTRAINT unique_hospital_slot UNIQUE (hospital_id, date, time);

-- Gate messaging persistence
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.payments(id);

-- Notify Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';
