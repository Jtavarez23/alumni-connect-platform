-- Alumni Connect - Create yearbooks-tiles Storage Bucket
-- Create the tiles bucket as specified in master document AC-ARCH-003 section 1

-- Create yearbooks-tiles bucket for Deep Zoom/IIIF tiles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('yearbooks-tiles', 'yearbooks-tiles', true, 1000000000, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the yearbooks-tiles bucket
CREATE POLICY "Tiles are publicly readable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'yearbooks-tiles');

CREATE POLICY "Only service role can write to yearbooks-tiles" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'yearbooks-tiles' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can update yearbooks-tiles" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'yearbooks-tiles' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can delete from yearbooks-tiles" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'yearbooks-tiles' AND auth.role() = 'service_role');