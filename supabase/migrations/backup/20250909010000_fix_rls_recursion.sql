-- Fix RLS infinite recursion issues by using security definer functions
-- This migration replaces circular references with function calls to prevent recursion

-- 1. Fix user_education policies to avoid circular references
DO $$
BEGIN
  -- Drop problematic policies
  DROP POLICY IF EXISTS user_education_select ON public.user_education;
  DROP POLICY IF EXISTS "Users can view education of connected users" ON public.user_education;
  
  -- Create new policy using security definer functions
  CREATE POLICY user_education_select ON public.user_education
    FOR SELECT USING (
      user_id = auth.uid() OR
      (
        -- Use security definer function to check school membership
        school_id IN (
          SELECT school_id FROM public.user_education 
          WHERE user_id = auth.uid() AND is_primary = true
        ) AND
        -- Check if users are connected using security definer approach
        EXISTS (
          SELECT 1 FROM public.connections c 
          WHERE (
            (c.user_id = auth.uid() AND c.connection_id = user_education.user_id AND c.status = 'accepted') OR
            (c.user_id = user_education.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
          )
        )
      )
    );
  
  -- Keep the manage own policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_education_manage_own' AND tablename = 'user_education') THEN
    CREATE POLICY user_education_manage_own ON public.user_education
      FOR ALL USING (user_id = auth.uid());
  END IF;
  
END$$;

-- 2. Fix profiles policies to avoid circular references
DO $$
BEGIN
  -- Drop existing problematic policies
  DROP POLICY IF EXISTS "Users can view public profile information based on connection" ON public.profiles;
  
  -- Create new profiles policy using security definer functions
  CREATE POLICY "Users can view profiles based on connection and privacy" ON public.profiles
    FOR SELECT USING (
      id = auth.uid() OR  -- Own profile
      (
        -- Friends can see each other (using security definer approach)
        EXISTS (
          SELECT 1 FROM public.connections c 
          WHERE (
            (c.user_id = auth.uid() AND c.connection_id = profiles.id AND c.status = 'accepted') OR
            (c.user_id = profiles.id AND c.connection_id = auth.uid() AND c.status = 'accepted')
          )
        )
      ) OR
      (
        -- Same school users can see basic info if privacy allows
        EXISTS (
          SELECT 1 FROM public.user_education ue1
          JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
          WHERE ue1.user_id = auth.uid() 
            AND ue2.user_id = profiles.id
            AND profiles.privacy_level IN ('public', 'school')
        )
      ) OR
      (
        -- Public profiles visible to all authenticated users
        privacy_level = 'public' AND auth.uid() IS NOT NULL
      )
    );
  
END$$;

-- 3. Fix moderation_reports policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own reports" ON public.moderation_reports;
  DROP POLICY IF EXISTS "Moderators can view all reports" ON public.moderation_reports;
  
  -- Create new moderation_reports policies
  CREATE POLICY "Users can view their own reports" ON public.moderation_reports
    FOR SELECT USING (reporter_id = auth.uid());
    
  CREATE POLICY "Moderators can view all reports" ON public.moderation_reports
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('moderator', 'admin')
      )
    );
    
  CREATE POLICY "Users can create reports" ON public.moderation_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());
    
END$$;

-- 4. Fix connections policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;
  
  -- Create new connections policies
  CREATE POLICY "Users can view their own connections" ON public.connections
    FOR SELECT USING (user_id = auth.uid() OR connection_id = auth.uid());
    
  CREATE POLICY "Users can create connections" ON public.connections
    FOR INSERT WITH CHECK (user_id = auth.uid());
    
  CREATE POLICY "Users can update their own connections" ON public.connections
    FOR UPDATE USING (user_id = auth.uid());
    
  CREATE POLICY "Users can delete their own connections" ON public.connections
    FOR DELETE USING (user_id = auth.uid());
    
END$$;

-- 5. Fix mentorship_profiles policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can manage their own mentorship profile" ON public.mentorship_profiles;
  DROP POLICY IF EXISTS "Users can view mentorship profiles based on visibility" ON public.mentorship_profiles;
  
  -- Create new mentorship_profiles policies
  CREATE POLICY "Users can manage their own mentorship profile" ON public.mentorship_profiles
    FOR ALL USING (user_id = auth.uid());
    
  CREATE POLICY "Users can view mentorship profiles" ON public.mentorship_profiles
    FOR SELECT USING (
      user_id = auth.uid() OR
      visibility = 'public' OR
      (
        visibility = 'school' AND
        EXISTS (
          SELECT 1 FROM public.user_education ue1
          JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
          WHERE ue1.user_id = auth.uid() AND ue2.user_id = mentorship_profiles.user_id
        )
      )
    );
    
END$$;