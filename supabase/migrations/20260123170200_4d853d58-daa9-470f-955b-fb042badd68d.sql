-- Add logo_url column to environments table
ALTER TABLE public.environments
ADD COLUMN logo_url TEXT NULL;

-- Create storage bucket for environment logos (public for display in sidebar)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('environment-logos', 'environment-logos', true, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow authenticated users to upload logos for their environments
CREATE POLICY "Environment admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'environment-logos' 
  AND auth.role() = 'authenticated'
);

-- Storage policy: allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view environment logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'environment-logos');

-- Storage policy: allow environment admins to update their logos
CREATE POLICY "Environment admins can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');

-- Storage policy: allow environment admins to delete their logos
CREATE POLICY "Environment admins can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'environment-logos' AND auth.role() = 'authenticated');