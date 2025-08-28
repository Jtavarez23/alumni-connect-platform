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