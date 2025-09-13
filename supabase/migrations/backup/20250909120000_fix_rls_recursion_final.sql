-- Final RLS Recursion Fix with SECURITY DEFINER Functions
-- Based on AC-ARCH-002b specifications from Master Documents

-- =============================================
-- 1. SECURITY DEFINER FUNCTIONS TO BREAK RECURSION
-- =============================================

-- Function to check if two users are connected (breaks recursion)
CREATE OR REPLACE FUNCTION public.are_users_connected(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.connections c 
    WHERE (
      (c.user_id = user1_id AND c.connection_id = user2_id AND c.status = 'accepted') OR
      (c.user_id = user2_id AND c.connection_id = user1_id AND c.status = 'accepted')
    )
  );
END;
$$;

-- Function to check if user is in same school as another user
CREATE OR REPLACE FUNCTION public.are_users_in_same_school(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_education ue1
    JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
    WHERE ue1.user_id = user1_id AND ue2.user_id = user2_id
  );
END;
$$;

-- Function to check user's privacy settings safely
CREATE OR REPLACE FUNCTION public.get_user_privacy_level(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_level text;
BEGIN
  SELECT COALESCE(privacy_settings->>'profile_visibility', 'public')
  INTO privacy_level
  FROM public.profiles
  WHERE id = target_user_id;
  
  RETURN privacy_level;
END;
$$;

-- =============================================
-- 2. UPDATED RLS POLICIES USING SECURITY DEFINER FUNCTIONS
-- =============================================

-- Fix profiles table policies
DO $$
BEGIN
  -- Drop existing problematic policies
  DROP POLICY IF EXISTS "Users can view profiles based on connection and privacy" ON public.profiles;
  
  -- Create new profiles policy using security definer functions
  CREATE POLICY "profiles_select_safe" ON public.profiles
    FOR SELECT USING (
      id = auth.uid() OR  -- Always see own profile
      
      -- Connected users can see each other (using security definer)
      public.are_users_connected(auth.uid(), id) OR
      
      -- Same school users if privacy allows
      (
        public.are_users_in_same_school(auth.uid(), id) AND
        public.get_user_privacy_level(id) IN ('public', 'school')
      ) OR
      
      -- Public profiles visible to all authenticated users
      (public.get_user_privacy_level(id) = 'public' AND auth.uid() IS NOT NULL)
    );
END$$;

-- Fix user_education table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS user_education_select ON public.user_education;
  
  -- Create new user_education policy using security definer functions
  CREATE POLICY user_education_select ON public.user_education
    FOR SELECT USING (
      user_id = auth.uid() OR  -- Always see own education
      
      -- Same school users can see each other's education
      (
        public.are_users_in_same_school(auth.uid(), user_id) AND
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = user_education.user_id 
          AND public.get_user_privacy_level(p.id) IN ('public', 'school')
        )
      ) OR
      
      -- Connected users can see each other's education
      (
        public.are_users_connected(auth.uid(), user_id) AND
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = user_education.user_id 
          AND public.get_user_privacy_level(p.id) IN ('public', 'connections')
        )
      )
    );
    
  -- Keep manage own policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_education_manage_own' AND tablename = 'user_education') THEN
    CREATE POLICY user_education_manage_own ON public.user_education
      FOR ALL USING (user_id = auth.uid());
  END IF;
END$$;

-- Fix connections table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
  
  -- Create new connections policies using security definer functions
  CREATE POLICY "connections_view_own" ON public.connections
    FOR SELECT USING (
      user_id = auth.uid() OR connection_id = auth.uid()
    );
    
  CREATE POLICY "connections_manage_own" ON public.connections
    FOR ALL USING (user_id = auth.uid());
END$$;

-- =============================================
-- 3. VERIFICATION AND TESTING
-- =============================================

-- Create test function to verify no recursion
CREATE OR REPLACE FUNCTION public.test_rls_no_recursion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test that we can query profiles without recursion
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  
  -- Test that we can query user_education without recursion  
  PERFORM 1 FROM public.user_education WHERE user_id = auth.uid() LIMIT 1;
  
  -- Test that we can query connections without recursion
  PERFORM 1 FROM public.connections WHERE user_id = auth.uid() LIMIT 1;
  
  RAISE NOTICE '✅ RLS recursion tests passed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ RLS recursion detected: %', SQLERRM;
END;
$$;

-- Grant execute permissions on security definer functions
GRANT EXECUTE ON FUNCTION public.are_users_connected TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_users_in_same_school TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_privacy_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_rls_no_recursion TO authenticated;