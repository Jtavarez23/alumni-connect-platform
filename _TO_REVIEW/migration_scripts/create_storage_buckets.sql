-- Alumni Connect - Create Storage Buckets
-- Create required storage buckets for yearbook processing

-- Create originals bucket for raw yearbook uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('originals', 'originals', false, 500000000, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'])
ON CONFLICT (id) DO NOTHING;

-- Create tiles bucket for deep zoom tiles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('tiles', 'tiles', true, 10000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create previews bucket for thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('previews', 'previews', true, 5000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create post-media bucket for social content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('post-media', 'post-media', false, 50000000, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the buckets

-- Originals bucket policies (private - only authenticated users can access their school's yearbooks)
CREATE POLICY "Authenticated users can upload originals" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'originals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view originals from their schools" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'originals' AND auth.role() = 'authenticated');

-- Tiles bucket policies (public read for deep zoom)
CREATE POLICY "Public can view tiles" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'tiles');

CREATE POLICY "Authenticated users can manage tiles" 
ON storage.objects FOR ALL 
USING (bucket_id = 'tiles' AND auth.role() = 'authenticated');

-- Previews bucket policies (public read)
CREATE POLICY "Public can view previews" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'previews');

CREATE POLICY "Authenticated users can manage previews" 
ON storage.objects FOR ALL 
USING (bucket_id = 'previews' AND auth.role() = 'authenticated');

-- Post-media bucket policies (private, user-owned content)
CREATE POLICY "Users can manage their own post media" 
ON storage.objects FOR ALL 
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket policies (public read, user-owned)
CREATE POLICY "Public can view avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can manage their own avatars" 
ON storage.objects FOR ALL 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);