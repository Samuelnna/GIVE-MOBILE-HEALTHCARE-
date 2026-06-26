
-- ============================================================
-- Health Topics (Blog) Table and Storage Policies
-- ============================================================

-- 1. Create the health_topics table
CREATE TABLE IF NOT EXISTS public.health_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT, -- Fallback name
  image_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.health_topics ENABLE ROW LEVEL SECURITY;

-- 2. Health Topics Policies
DROP POLICY IF EXISTS "Anyone can view health topics" ON public.health_topics;
CREATE POLICY "Anyone can view health topics" ON public.health_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage health topics" ON public.health_topics;
CREATE POLICY "Admins can manage health topics" ON public.health_topics 
FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage Setup (Run these in order)

-- Ensure the bucket exists (Requires appropriate permissions)
-- Note: Supabase Storage SQL is often restricted. Use the Dashboard to create a PUBLIC bucket named 'blog-images'.
-- Or try this if your permissions allow:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true) ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for 'blog-images' bucket

-- Policy for viewing images (Public)
DROP POLICY IF EXISTS "Public View Blog Images" ON storage.objects;
CREATE POLICY "Public View Blog Images" ON storage.objects FOR SELECT 
USING (bucket_id = 'blog-images');

-- Policy for Admin Uploading
DROP POLICY IF EXISTS "Admin Upload Blog Images" ON storage.objects;
CREATE POLICY "Admin Upload Blog Images" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'blog-images');

-- Policy for Admin Updating
DROP POLICY IF EXISTS "Admin Update Blog Images" ON storage.objects;
CREATE POLICY "Admin Update Blog Images" ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'blog-images');

-- Policy for Admin Deleting
DROP POLICY IF EXISTS "Admin Delete Blog Images" ON storage.objects;
CREATE POLICY "Admin Delete Blog Images" ON storage.objects FOR DELETE 
USING (bucket_id = 'blog-images');
