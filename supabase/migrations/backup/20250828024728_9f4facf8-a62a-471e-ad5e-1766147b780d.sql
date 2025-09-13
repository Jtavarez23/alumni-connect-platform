-- Create yearbook party rooms table
CREATE TABLE public.yearbook_party_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  host_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  yearbook_edition_id uuid REFERENCES yearbook_editions(id) ON DELETE CASCADE,
  current_page integer DEFAULT 1,
  is_active boolean DEFAULT true,
  max_participants integer DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create yearbook party participants table
CREATE TABLE public.yearbook_party_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES yearbook_party_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.yearbook_party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_party_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for party rooms
CREATE POLICY "Users can view active party rooms" ON public.yearbook_party_rooms
FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create party rooms" ON public.yearbook_party_rooms
FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their rooms" ON public.yearbook_party_rooms
FOR UPDATE USING (host_id = auth.uid());

-- RLS policies for party participants  
CREATE POLICY "Users can view participants in rooms they've joined" ON public.yearbook_party_participants
FOR SELECT USING (
  room_id IN (
    SELECT room_id FROM yearbook_party_participants WHERE user_id = auth.uid()
  ) OR 
  room_id IN (
    SELECT id FROM yearbook_party_rooms WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Users can join party rooms" ON public.yearbook_party_participants
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON public.yearbook_party_participants
FOR UPDATE USING (user_id = auth.uid());

-- Create sample yearbook editions for existing schools
INSERT INTO public.yearbook_editions (id, school_id, year, title, page_count, upload_status, cover_image_url) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'f47ffef2-af5f-4006-ac1b-41b1652666f2', 2023, 'Lincoln Lions 2023', 150, 'completed', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/yearbook-covers/lincoln-2023-cover.jpg'),
('660e8400-e29b-41d4-a716-446655440001', 'f47ffef2-af5f-4006-ac1b-41b1652666f2', 2022, 'Lincoln Lions 2022', 140, 'completed', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/yearbook-covers/lincoln-2022-cover.jpg'),
('660e8400-e29b-41d4-a716-446655440002', '4abc61c0-2c7b-4c23-9d88-35abe45c3863', 2023, 'Roosevelt Eagles 2023', 120, 'completed', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/yearbook-covers/roosevelt-2023-cover.jpg');

-- Create sample yearbook entries
INSERT INTO public.yearbook_entries (id, edition_id, student_name, photo_url, page_number, activities, honors, quote) VALUES
('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'Sarah Johnson', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/profile-pictures/sarah-yearbook.jpg', 25, ARRAY['Drama Club', 'Student Council', 'Tennis Team'], ARRAY['Honor Roll', 'Best Actress'], 'The future belongs to those who believe in the beauty of their dreams.'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'Marcus Chen', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/profile-pictures/marcus-yearbook.jpg', 26, ARRAY['Football Team', 'Math Club', 'Debate Team'], ARRAY['MVP Football', 'Academic Excellence'], 'Success is not final, failure is not fatal: it is the courage to continue that counts.'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', 'Emily Rodriguez', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/profile-pictures/emily-yearbook.jpg', 27, ARRAY['Art Club', 'Yearbook Committee', 'Volunteer Club'], ARRAY['Outstanding Artist', 'Community Service'], 'Art is not what you see, but what you make others see.'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440000', 'David Thompson', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/profile-pictures/david-yearbook.jpg', 28, ARRAY['Basketball Team', 'Science Club', 'Peer Tutoring'], ARRAY['Team Captain', 'Science Fair Winner'], 'The only way to do great work is to love what you do.'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'Jessica Park', 'https://dyhloaxsdcfgfyfhrdfc.supabase.co/storage/v1/object/public/profile-pictures/jessica-yearbook.jpg', 30, ARRAY['Choir', 'Key Club', 'National Honor Society'], ARRAY['Solo Performance', 'NHS President'], 'Music is the universal language of mankind.');

-- Create triggers for updated_at
CREATE TRIGGER update_yearbook_party_rooms_updated_at
BEFORE UPDATE ON public.yearbook_party_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_yearbook_party_participants_updated_at
BEFORE UPDATE ON public.yearbook_party_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();