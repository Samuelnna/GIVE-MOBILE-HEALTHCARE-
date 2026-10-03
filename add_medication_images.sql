ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('medication-images', 'medication-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read medication images" ON storage.objects;
CREATE POLICY "Public can read medication images"
ON storage.objects FOR SELECT
USING (bucket_id = 'medication-images');

DROP POLICY IF EXISTS "Admins can upload medication images" ON storage.objects;
CREATE POLICY "Admins can upload medication images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medication-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete medication images" ON storage.objects;
CREATE POLICY "Admins can delete medication images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medication-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

NOTIFY pgrst, 'reload schema';
