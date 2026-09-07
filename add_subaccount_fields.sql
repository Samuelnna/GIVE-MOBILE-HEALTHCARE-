
-- Add subaccount_id and bank_details to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subaccount_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Add subaccount_id and bank_details to labs table
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS subaccount_id TEXT;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Add subaccount_id and bank_details to hospitals table
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS subaccount_id TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Add subaccount_id and bank_details to pharmacies table
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS subaccount_id TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Add flw_id to payments table for internal Flutterwave numeric ID
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS flw_id BIGINT;

-- Add payment_id to hospital_appointments for Admin tracking
ALTER TABLE public.hospital_appointments ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- Add activation tracking to prescriptions
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS is_reminder_activated BOOLEAN DEFAULT false;

-- Update RLS policies to allow reading these fields
-- Assuming profiles are already readable by the owner or for specific roles
