ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hospital_name TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
