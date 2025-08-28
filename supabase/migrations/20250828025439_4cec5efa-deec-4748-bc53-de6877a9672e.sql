-- Create missing mystery_game_sessions table
CREATE TABLE public.mystery_game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES public.schools(id) NOT NULL,
  graduation_year integer NOT NULL,
  game_status text DEFAULT 'active' CHECK (game_status IN ('active', 'completed', 'expired')),
  score integer DEFAULT 0,
  clues_revealed integer DEFAULT 0,
  max_clues integer DEFAULT 3,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mystery_game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for mystery game sessions
CREATE POLICY "Users can view their own mystery game sessions" 
ON public.mystery_game_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mystery game sessions" 
ON public.mystery_game_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mystery game sessions" 
ON public.mystery_game_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix security issues by restricting access to sensitive tables

-- Fix badge_types access - only show to users with badges or premium users
DROP POLICY IF EXISTS "Badge types are viewable by all authenticated users" ON public.badge_types;
CREATE POLICY "Badge types are viewable by users with badges or premium users" 
ON public.badge_types 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND subscription_status = 'premium'
    )
  )
);

-- Fix reactions access - only show reactions on content user can access
DROP POLICY IF EXISTS "Users can view reactions on accessible content" ON public.reactions;
CREATE POLICY "Users can view reactions on accessible content" 
ON public.reactions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- User can see their own reactions
    user_id = auth.uid() OR
    -- User can see reactions on yearbook entries they can access
    (entity_type = 'yearbook_entry' AND entity_id IN (
      SELECT ye.id FROM yearbook_entries ye
      JOIN yearbook_editions ed ON ye.edition_id = ed.id
      WHERE ed.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )) OR
    -- User can see reactions on then_vs_now posts they can access
    (entity_type = 'then_vs_now_post' AND entity_id IN (
      SELECT p.id FROM then_vs_now_posts p
      WHERE p.visibility = 'public' OR 
            p.user_id = auth.uid() OR
            (p.visibility = 'friends' AND p.user_id IN (
              SELECT CASE 
                WHEN f.requester_id = auth.uid() THEN f.addressee_id
                WHEN f.addressee_id = auth.uid() THEN f.requester_id
              END
              FROM friendships f
              WHERE f.status = 'accepted' AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
            ))
    ))
  )
);

-- Fix party rooms access - restrict to school-based access
DROP POLICY IF EXISTS "Users can view active party rooms" ON public.yearbook_party_rooms;
CREATE POLICY "Users can view active party rooms from their school" 
ON public.yearbook_party_rooms 
FOR SELECT 
USING (
  is_active = true AND 
  auth.uid() IS NOT NULL AND (
    -- Host can always see their rooms
    host_id = auth.uid() OR
    -- Users can see rooms for yearbooks from their school
    yearbook_edition_id IN (
      SELECT ed.id FROM yearbook_editions ed
      WHERE ed.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    ) OR
    -- Users already in the room can see it
    id IN (
      SELECT room_id FROM yearbook_party_participants 
      WHERE user_id = auth.uid()
    )
  )
);

-- Add trigger for updated_at on mystery_game_sessions
CREATE TRIGGER update_mystery_game_sessions_updated_at
  BEFORE UPDATE ON public.mystery_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sample mystery game sessions
INSERT INTO public.mystery_game_sessions (id, user_id, target_user_id, school_id, graduation_year, clues_revealed, score) VALUES
('11111111-1111-1111-1111-111111111111', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'c99870dc-6821-4b7b-985b-02c0df497b69', '550e8400-e29b-41d4-a716-446655440000', 2008, 1, 10),
('22222222-2222-2222-2222-222222222222', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'd99870dc-6821-4b7b-985b-02c0df497b69', '550e8400-e29b-41d4-a716-446655440000', 2008, 2, 20);

-- Create additional sample user profiles for better testing
INSERT INTO public.profiles (id, email, first_name, last_name, school_id, graduation_year, bio, verification_status) VALUES
('c99870dc-6821-4b7b-985b-02c0df497b69', 'emma.johnson@email.com', 'Emma', 'Johnson', '550e8400-e29b-41d4-a716-446655440000', 2008, 'Former student council president, now working in marketing. Love reconnecting with old friends!', 'verified'),
('d99870dc-6821-4b7b-985b-02c0df497b69', 'michael.brown@email.com', 'Michael', 'Brown', '550e8400-e29b-41d4-a716-446655440000', 2008, 'Class of 2008 football captain. Running my own business now. Always down for a reunion!', 'verified'),
('e99870dc-6821-4b7b-985b-02c0df497b69', 'sophia.davis@email.com', 'Sophia', 'Davis', '550e8400-e29b-41d4-a716-446655440000', 2009, 'Art teacher and freelance photographer. Still painting and creating!', 'verified');

-- Create sample party rooms for testing
INSERT INTO public.yearbook_party_rooms (id, name, description, host_id, yearbook_edition_id, max_participants) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Class of 2008 Memory Lane', 'Let''s browse through our senior year yearbook together and share memories!', 'b99870dc-6821-4b7b-985b-02c0df497b69', '660e8400-e29b-41d4-a716-446655440000', 15),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Friday Night Nostalgia', 'End of week yearbook browsing session - come relive the good times!', 'c99870dc-6821-4b7b-985b-02c0df497b69', '660e8400-e29b-41d4-a716-446655440000', 20);

-- Create sample mystery lookups with proper clues
INSERT INTO public.mystery_lookups (id, target_user_id, looker_id, school_name, graduation_year, mutual_friends_count, clues) VALUES
('33333333-3333-3333-3333-333333333333', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'c99870dc-6821-4b7b-985b-02c0df497b69', 'Lincoln High School', 2008, 3, '{"activities": ["Student Council", "Drama Club"], "location": "Lives in Seattle", "interests": ["Photography", "Travel"]}'),
('44444444-4444-4444-4444-444444444444', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'd99870dc-6821-4b7b-985b-02c0df497b69', 'Lincoln High School', 2008, 5, '{"activities": ["Football Team", "Debate Club"], "location": "Still in hometown", "interests": ["Business", "Sports"]}');

-- Create some sample friendships for better social interactions
INSERT INTO public.friendships (id, requester_id, addressee_id, status) VALUES
('55555555-5555-5555-5555-555555555555', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'c99870dc-6821-4b7b-985b-02c0df497b69', 'accepted'),
('66666666-6666-6666-6666-666666666666', 'b99870dc-6821-4b7b-985b-02c0df497b69', 'd99870dc-6821-4b7b-985b-02c0df497b69', 'accepted'),
('77777777-7777-7777-7777-777777777777', 'c99870dc-6821-4b7b-985b-02c0df497b69', 'd99870dc-6821-4b7b-985b-02c0df497b69', 'accepted');