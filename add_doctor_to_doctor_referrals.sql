-- Allow professionals to refer a patient directly to another active professional.
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referred_doctor_id UUID
  REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS referrals_referred_doctor_id_idx
  ON public.referrals (referred_doctor_id);
