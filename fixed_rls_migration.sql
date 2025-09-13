-- Complete RLS Policies Migration (FIXED VERSION)
-- Comprehensive Row Level Security policies for all tables
-- SKIPS activity_feed since it's a view, not a table

-- =============================================
-- 1. USER & PROFILE TABLES RLS POLICIES
-- =============================================

-- profiles table: Complete policies
DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- View own profile and public profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_own_and_public' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_select_own_and_public ON public.profiles
      FOR SELECT USING (
        id = auth.uid() OR
        privacy_settings->>'profile_visibility' = 'public' OR
        (privacy_settings->>'profile_visibility' = 'connections' AND EXISTS (
          SELECT 1 FROM public.connections c 
          WHERE (c.user_id = auth.uid() AND c.connection_id = profiles.id AND c.status = 'accepted') OR
                (c.user_id = profiles.id AND c.connection_id = auth.uid() AND c.status = 'accepted')
        ))
      );
  END IF;
  
  -- Update own profile only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE USING (id = auth.uid());
  END IF;
  
  -- Insert own profile only (should be handled by trigger)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert_own' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_insert_own ON public.profiles
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
  
  -- Delete own profile only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_delete_own' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_delete_own ON public.profiles
      FOR DELETE USING (id = auth.uid());
  END IF;
  
  -- Moderators can view all profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_moderators' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_select_moderators ON public.profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() 
          AND p.trust_level IN ('moderator', 'staff', 'school_admin')
        )
      );
  END IF;
END$$;

-- user_education table: School-based access
DO $$
BEGIN
  ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
  
  -- View own education or education of connections from same school
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_education_select' AND tablename = 'user_education') THEN
    CREATE POLICY user_education_select ON public.user_education
      FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections c 
          JOIN public.user_education ue2 ON ue2.user_id = c.connection_id
          WHERE (c.user_id = auth.uid() AND c.connection_id = user_education.user_id AND c.status = 'accepted') OR
                (c.user_id = user_education.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
          AND ue2.school_id = user_education.school_id
        )
      );
  END IF;
  
  -- Manage own education only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_education_manage_own' AND tablename = 'user_education') THEN
    CREATE POLICY user_education_manage_own ON public.user_education
      FOR ALL USING (user_id = auth.uid());
  END IF;
END$$;

-- =============================================
-- 2. YEARBOOK TABLES RLS POLICIES (COMPLETION)
-- =============================================

-- yearbooks table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.yearbooks ENABLE ROW LEVEL SECURITY;
  
  -- Update own yearbooks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbooks_update_own' AND tablename = 'yearbooks') THEN
    CREATE POLICY yearbooks_update_own ON public.yearbooks
      FOR UPDATE USING (uploaded_by = auth.uid());
  END IF;
  
  -- Delete own yearbooks (with restrictions)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbooks_delete_own' AND tablename = 'yearbooks') THEN
    CREATE POLICY yearbooks_delete_own ON public.yearbooks
      FOR DELETE USING (
        uploaded_by = auth.uid() AND
        status != 'ready' -- Can only delete yearbooks that are not yet published
      );
  END IF;
  
  -- Moderators can manage all yearbooks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbooks_manage_moderators' AND tablename = 'yearbooks') THEN
    CREATE POLICY yearbooks_manage_moderators ON public.yearbooks
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND trust_level IN ('moderator', 'staff', 'school_admin')
        )
      );
  END IF;
END$$;

-- yearbook_pages table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
  
  -- Yearbook owners can manage pages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_pages_manage_owners' AND tablename = 'yearbook_pages') THEN
    CREATE POLICY yearbook_pages_manage_owners ON public.yearbook_pages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.yearbooks y 
          WHERE y.id = yearbook_pages.yearbook_id 
          AND y.uploaded_by = auth.uid()
        )
      );
  END IF;
END$$;

-- yearbook_faces table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.yearbook_faces ENABLE ROW LEVEL SECURITY;
  
  -- Claim faces (insert claims)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_faces_claim' AND tablename = 'yearbook_faces') THEN
    CREATE POLICY yearbook_faces_claim ON public.yearbook_faces
      FOR UPDATE USING (
        claimed_by = auth.uid() OR
        claimed_by IS NULL -- Can claim unclaimed faces
      );
  END IF;
  
  -- Yearbook owners can manage faces
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_faces_manage_owners' AND tablename = 'yearbook_faces') THEN
    CREATE POLICY yearbook_faces_manage_owners ON public.yearbook_faces
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.yearbook_pages p
          JOIN public.yearbooks y ON y.id = p.yearbook_id
          WHERE p.id = yearbook_faces.page_id
          AND y.uploaded_by = auth.uid()
        )
      );
  END IF;
END$$;

-- yearbook_claims table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.yearbook_claims ENABLE ROW LEVEL SECURITY;
  
  -- Update own claims
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_claims_update_own' AND tablename = 'yearbook_claims') THEN
    CREATE POLICY yearbook_claims_update_own ON public.yearbook_claims
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  -- Delete own claims
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_claims_delete_own' AND tablename = 'yearbook_claims') THEN
    CREATE POLICY yearbook_claims_delete_own ON public.yearbook_claims
      FOR DELETE USING (user_id = auth.uid());
  END IF;
  
  -- Moderators can manage all claims
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yearbook_claims_manage_moderators' AND tablename = 'yearbook_claims') THEN
    CREATE POLICY yearbook_claims_manage_moderators ON public.yearbook_claims
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND trust_level IN ('moderator', 'staff', 'school_admin')
        )
      );
  END IF;
END$$;

-- =============================================
-- 3. SOCIAL & CONNECTION TABLES RLS POLICIES
-- =============================================

-- connections table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
  
  -- View connections involving user
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'connections_select_involved' AND tablename = 'connections') THEN
    CREATE POLICY connections_select_involved ON public.connections
      FOR SELECT USING (
        user_id = auth.uid() OR
        connection_id = auth.uid()
      );
  END IF;
  
  -- Create connection requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'connections_insert_own' AND tablename = 'connections') THEN
    CREATE POLICY connections_insert_own ON public.connections
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  -- Update own connection requests (accept/reject)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'connections_update_connection' AND tablename = 'connections') THEN
    CREATE POLICY connections_update_connection ON public.connections
      FOR UPDATE USING (connection_id = auth.uid());
  END IF;
  
  -- Delete own connection requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'connections_delete_own' AND tablename = 'connections') THEN
    CREATE POLICY connections_delete_own ON public.connections
      FOR DELETE USING (user_id = auth.uid() OR connection_id = auth.uid());
  END IF;
END$$;

-- =============================================
-- 4. CONTENT & ACTIVITY TABLES RLS POLICIES
-- =============================================

-- posts table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
  
  -- View posts based on privacy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_select_privacy' AND tablename = 'posts') THEN
    CREATE POLICY posts_select_privacy ON public.posts
      FOR SELECT USING (
        privacy = 'public' OR
        (privacy = 'connections' AND EXISTS (
          SELECT 1 FROM public.connections c 
          WHERE (c.user_id = auth.uid() AND c.connection_id = posts.user_id AND c.status = 'accepted') OR
                (c.user_id = posts.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
        )) OR
        user_id = auth.uid()
      );
  END IF;
  
  -- Create posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_insert_own' AND tablename = 'posts') THEN
    CREATE POLICY posts_insert_own ON public.posts
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  -- Update own posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_update_own' AND tablename = 'posts') THEN
    CREATE POLICY posts_update_own ON public.posts
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  -- Delete own posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_delete_own' AND tablename = 'posts') THEN
    CREATE POLICY posts_delete_own ON public.posts
      FOR DELETE USING (user_id = auth.uid());
  END IF;
  
  -- Moderators can manage all posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_manage_moderators' AND tablename = 'posts') THEN
    CREATE POLICY posts_manage_moderators ON public.posts
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND trust_level IN ('moderator', 'staff')
        )
      );
  END IF;
END$$;

-- comments table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
  
  -- View comments on viewable posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_select_viewable' AND tablename = 'comments') THEN
    CREATE POLICY comments_select_viewable ON public.comments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.posts p 
          WHERE p.id = comments.post_id 
          AND (
            p.privacy = 'public' OR
            (p.privacy = 'connections' AND EXISTS (
              SELECT 1 FROM public.connections c 
              WHERE (c.user_id = auth.uid() AND c.connection_id = p.user_id AND c.status = 'accepted') OR
                    (c.user_id = p.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
            )) OR
            p.user_id = auth.uid()
          )
        )
      );
  END IF;
  
  -- Create comments on viewable posts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_insert_viewable' AND tablename = 'comments') THEN
    CREATE POLICY comments_insert_viewable ON public.comments
      FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.posts p 
          WHERE p.id = comments.post_id 
          AND (
            p.privacy = 'public' OR
            (p.privacy = 'connections' AND EXISTS (
              SELECT 1 FROM public.connections c 
              WHERE (c.user_id = auth.uid() AND c.connection_id = p.user_id AND c.status = 'accepted') OR
                    (c.user_id = p.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
            ))
          )
        )
      );
  END IF;
  
  -- Update own comments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_update_own' AND tablename = 'comments') THEN
    CREATE POLICY comments_update_own ON public.comments
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  -- Delete own comments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_delete_own' AND tablename = 'comments') THEN
    CREATE POLICY comments_delete_own ON public.comments
      FOR DELETE USING (user_id = auth.uid());
  END IF;
  
  -- Moderators can manage all comments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_manage_moderators' AND tablename = 'comments') THEN
    CREATE POLICY comments_manage_moderators ON public.comments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND trust_level IN ('moderator', 'staff')
        )
      );
  END IF;
END$$;

-- =============================================
-- 5. NOTIFICATION TABLES RLS POLICIES
-- =============================================

-- notifications table: Complete policies
DO $$
BEGIN
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  
  -- View own notifications only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_select_own ON public.notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  -- Update own notifications (mark as read)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_update_own ON public.notifications
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  -- Delete own notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_delete_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_delete_own ON public.notifications
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END$$;

-- =============================================
-- 6. VERIFICATION AND VALIDATION
-- =============================================

DO $$
BEGIN
  -- Verify that RLS is enabled on critical tables
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') = true, 'RLS not enabled on profiles';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'yearbooks') = true, 'RLS not enabled on yearbooks';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'yearbook_pages') = true, 'RLS not enabled on yearbook_pages';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'connections') = true, 'RLS not enabled on connections';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'posts') = true, 'RLS not enabled on posts';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'comments') = true, 'RLS not enabled on comments';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'notifications') = true, 'RLS not enabled on notifications';
  
  -- Verify that policies exist for critical tables
  ASSERT (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') >= 3, 'Missing policies for profiles table';
  ASSERT (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'yearbooks') >= 3, 'Missing policies for yearbooks table';
  ASSERT (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'connections') >= 3, 'Missing policies for connections table';
  
  RAISE NOTICE 'RLS policies completion migration completed successfully';
END$$;