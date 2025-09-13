-- Alumni Connect - Create yearbooks-previews Storage Bucket
-- Create the previews bucket as specified in master document AC-ARCH-003 section 1

-- Create yearbooks-previews bucket for low-resolution preview images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('yearbooks-previews', 'yearbooks-previews', true, 50000000, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the yearbooks-previews bucket
CREATE POLICY "Previews are publicly readable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'yearbooks-previews');

CREATE POLICY "Only service role can write to yearbooks-previews" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'yearbooks-previews' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can update yearbooks-previews" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'yearbooks-previews' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can delete from yearbooks-previews" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'yearbooks-previews' AND auth.role() = 'service_role');