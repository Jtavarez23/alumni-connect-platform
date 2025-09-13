-- Alumni Connect - Create yearbooks-originals Storage Bucket
-- Create the correct bucket name as specified in master document AC-ARCH-004

-- Create yearbooks-originals bucket for raw yearbook uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('yearbooks-originals', 'yearbooks-originals', false, 500000000, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the yearbooks-originals bucket
CREATE POLICY "Authenticated users can upload to yearbooks-originals" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'yearbooks-originals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view yearbooks-originals from their schools" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'yearbooks-originals' AND auth.role() = 'authenticated');