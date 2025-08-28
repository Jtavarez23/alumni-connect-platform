-- Fix critical security issues identified by scanner

-- 1. Fix RLS policies for activity_feed table
CREATE POLICY "Users can view their own activities and relevant activities" 
ON activity_feed 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (
    -- Allow viewing activities from friends
    related_user_id IN (
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
    -- Allow viewing activities from same school
    related_user_id IN (
      SELECT p.id FROM profiles p 
      WHERE p.school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "System can create activity feed entries" 
ON activity_feed 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own activity status" 
ON activity_feed 
FOR UPDATE 
USING (user_id = auth.uid());

-- 2. Fix profile visibility for social features while maintaining privacy
CREATE POLICY "Users can view public profile information based on connection" 
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
    privacy_level IN ('public', 'school')
  ) OR
  (
    -- Public profiles visible to all authenticated users
    privacy_level = 'public' AND auth.uid() IS NOT NULL
  )
);

-- 3. Restrict schools table to authenticated users only
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

-- 4. Fix search paths for existing functions
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

-- 5. Create security definer function for user role checking (to avoid infinite recursion)
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_privacy_level()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $$
  SELECT privacy_level FROM profiles WHERE id = auth.uid();
$$;