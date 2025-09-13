-- Create storage bucket for yearbook covers
INSERT INTO storage.buckets (id, name, public) VALUES ('yearbook-covers', 'yearbook-covers', true);

-- Create storage policies for yearbook covers
CREATE POLICY "Yearbook covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'yearbook-covers');

CREATE POLICY "Authenticated users can upload yearbook covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'yearbook-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own yearbook covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'yearbook-covers' AND auth.uid() IS NOT NULL);

-- Update yearbook_editions table to allow uploads
ALTER TABLE yearbook_editions ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Create policy to allow authenticated users to insert yearbook editions
CREATE POLICY "Authenticated users can upload yearbook editions" 
ON yearbook_editions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- Create policy to allow users to view uploaded yearbook editions
CREATE POLICY "Users can view completed yearbook editions" 
ON yearbook_editions 
FOR SELECT 
USING (upload_status = 'completed' OR uploaded_by = auth.uid());