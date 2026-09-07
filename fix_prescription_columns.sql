
-- Add missing columns to prescriptions table for duration and reminders
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 7;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT true;

-- Notify Supabase to refresh the schema cache
NOTIFY pgrst, 'reload schema';
