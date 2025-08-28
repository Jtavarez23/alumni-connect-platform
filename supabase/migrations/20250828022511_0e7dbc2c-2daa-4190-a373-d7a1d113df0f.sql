-- Fix critical security issues and implement advanced social features

-- 1. Fix profile visibility for social features while maintaining privacy  
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Users can view profiles based on privacy and connections" 
ON profiles 
FOR SELECT 
USING (
  id = auth.uid() OR  -- Own profile
  (
    -- Friends can see each other
    id IN (
      SELECT CASE 
        WHEN requester_id = auth.uid() THEN addressee_id
        WHEN addressee_id = auth.uid() THEN requester_id
        ELSE NULL
      END 
      FROM friendships 
      WHERE status = 'accepted' AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  ) OR
  (
    -- Same school users can see basic info if privacy allows
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    ) AND 
    privacy_level IN ('public', 'school') AND
    auth.uid() IS NOT NULL
  ) OR
  (
    -- Public profiles visible to all authenticated users
    privacy_level = 'public' AND auth.uid() IS NOT NULL
  )
);

-- 2. Restrict schools table to authenticated users only
DROP POLICY IF EXISTS "Users can view approved schools and their own submissions" ON schools;

CREATE POLICY "Authenticated users can view approved schools" 
ON schools 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    submission_status = 'approved' OR 
    (submission_status = 'pending' AND submitted_by = auth.uid())
  )
);

-- 3. Create Then vs Now photo comparison table
CREATE TABLE IF NOT EXISTS then_vs_now_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  then_photo_url text NOT NULL,
  now_photo_url text NOT NULL,
  caption text,
  yearbook_entry_id uuid REFERENCES yearbook_entries(id),
  visibility text DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'school')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE then_vs_now_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own then vs now posts" 
ON then_vs_now_posts 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view then vs now posts based on visibility" 
ON then_vs_now_posts 
FOR SELECT 
USING (
  user_id = auth.uid() OR  -- Own posts
  (
    visibility = 'public' AND auth.uid() IS NOT NULL
  ) OR
  (
    visibility = 'friends' AND user_id IN (
      SELECT CASE 
        WHEN requester_id = auth.uid() THEN addressee_id
        WHEN addressee_id = auth.uid() THEN requester_id
        ELSE NULL
      END 
      FROM friendships 
      WHERE status = 'accepted' AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  ) OR
  (
    visibility = 'school' AND user_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- 4. Create enhanced mystery lookups for better game mechanics
CREATE TABLE IF NOT EXISTS mystery_game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clues_revealed integer DEFAULT 0,
  max_clues integer DEFAULT 5,
  score integer DEFAULT 0,
  completed boolean DEFAULT false,
  revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(player_id, target_user_id, created_at::date)
);

ALTER TABLE mystery_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mystery game sessions" 
ON mystery_game_sessions 
FOR SELECT 
USING (player_id = auth.uid() OR target_user_id = auth.uid());

CREATE POLICY "Users can create mystery game sessions" 
ON mystery_game_sessions 
FOR INSERT 
WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users can update their own mystery game sessions" 
ON mystery_game_sessions 
FOR UPDATE 
USING (player_id = auth.uid() OR target_user_id = auth.uid());

-- 5. Create yearbook party rooms for group viewing
CREATE TABLE IF NOT EXISTS yearbook_party_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yearbook_edition_id uuid REFERENCES yearbook_editions(id),
  current_page integer DEFAULT 1,
  is_active boolean DEFAULT true,
  max_participants integer DEFAULT 20,
  room_code text UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE yearbook_party_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active party rooms from their school" 
ON yearbook_party_rooms 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    host_id = auth.uid() OR
    id IN (
      SELECT room_id FROM yearbook_party_participants 
      WHERE user_id = auth.uid()
    ) OR
    (
      is_active = true AND yearbook_edition_id IN (
        SELECT ye.id FROM yearbook_editions ye 
        JOIN profiles p ON p.school_id = ye.school_id 
        WHERE p.id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create party rooms" 
ON yearbook_party_rooms 
FOR INSERT 
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update their party rooms" 
ON yearbook_party_rooms 
FOR UPDATE 
USING (host_id = auth.uid());

-- 6. Create party room participants table
CREATE TABLE IF NOT EXISTS yearbook_party_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES yearbook_party_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

ALTER TABLE yearbook_party_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own participation" 
ON yearbook_party_participants 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Room hosts can view all participants" 
ON yearbook_party_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  room_id IN (
    SELECT id FROM yearbook_party_rooms WHERE host_id = auth.uid()
  )
);

-- 7. Fix search paths for existing functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_then_vs_now_user_id ON then_vs_now_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_then_vs_now_created_at ON then_vs_now_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mystery_sessions_player ON mystery_game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_mystery_sessions_target ON mystery_game_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_party_rooms_active ON yearbook_party_rooms(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_party_participants_room ON yearbook_party_participants(room_id, is_active);