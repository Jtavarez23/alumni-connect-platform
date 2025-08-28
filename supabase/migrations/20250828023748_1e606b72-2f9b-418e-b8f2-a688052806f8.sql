-- Create storage bucket for then vs now photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('then-vs-now', 'then-vs-now', true);

-- Create RLS policies for then vs now storage
CREATE POLICY "Allow authenticated users to upload then vs now photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'then-vs-now' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow public read access to then vs now photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'then-vs-now');

CREATE POLICY "Allow users to update their own then vs now photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'then-vs-now' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete their own then vs now photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'then-vs-now' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);