-- 🚀 RECONNECT HIVE V2 INSTANT MIGRATION
-- Copy this ENTIRE script into Supabase Dashboard > SQL Editor and click RUN
-- This combines all 3 migrations into one streamlined execution

-- =====================================================
-- MIGRATION 1: CORE V2 SCHEMA
-- =====================================================

-- 1. Create user_education table
CREATE TABLE IF NOT EXISTS public.user_education (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id),
  school_type text CHECK (school_type IN ('elementary', 'middle_school', 'high_school', 'college', 'university', 'graduate_school', 'trade_school')),
  start_year integer NOT NULL,
  end_year integer NOT NULL,
  start_grade text,
  end_grade text,
  is_primary boolean DEFAULT false,
  is_graduated boolean DEFAULT true,
  transfer_reason text,
  role_type text CHECK (role_type IN ('student', 'teacher', 'staff', 'administrator')) DEFAULT 'student',
  grade_level text,
  department text,
  activities text[],
  achievements text[],
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_year_range CHECK (end_year >= start_year),
  UNIQUE(user_id, school_id, start_year)
);

-- 2. Update profiles table for subscription tiers
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_views_enabled') THEN
    ALTER TABLE public.profiles ADD COLUMN profile_views_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'all_years_networking') THEN
    ALTER TABLE public.profiles ADD COLUMN all_years_networking boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active') THEN
    ALTER TABLE public.profiles ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'search_quota_used') THEN
    ALTER TABLE public.profiles ADD COLUMN search_quota_used integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'search_quota_reset_date') THEN
    ALTER TABLE public.profiles ADD COLUMN search_quota_reset_date date DEFAULT CURRENT_DATE;
  END IF;
END
$$;

-- 3. Create other essential tables
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  view_context text CHECK (view_context IN ('search', 'yearbook', 'group', 'direct', 'suggestion')),
  CONSTRAINT no_self_views CHECK (viewer_id != viewed_id)
);

CREATE TABLE IF NOT EXISTS public.search_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  searches_used integer DEFAULT 0,
  search_limit integer DEFAULT 3,
  last_search_at timestamptz,
  searches_detail jsonb DEFAULT '[]',
  earned_searches integer DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.messaging_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  can_message boolean DEFAULT false,
  reason text CHECK (reason IN ('in_network', 'premium_user', 'mutual_connection', 'same_school_year')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS public.social_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('linkedin', 'instagram', 'facebook', 'twitter')) NOT NULL,
  platform_username text NOT NULL,
  platform_url text,
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  import_permissions jsonb DEFAULT '{}',
  last_import timestamptz,
  is_premium_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- 4. Enable RLS on new tables
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- 5. Create essential RLS policies
DO $$
BEGIN
  -- User Education Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_education' AND policyname = 'Users can manage their own education history') THEN
    EXECUTE 'CREATE POLICY "Users can manage their own education history" ON user_education FOR ALL USING (user_id = auth.uid())';
  END IF;

  -- Search Quota Policies  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_quotas' AND policyname = 'Users can manage their own search quotas') THEN
    EXECUTE 'CREATE POLICY "Users can manage their own search quotas" ON search_quotas FOR ALL USING (user_id = auth.uid())';
  END IF;

  -- Messaging Permissions Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messaging_permissions' AND policyname = 'Users can view their messaging permissions') THEN
    EXECUTE 'CREATE POLICY "Users can view their messaging permissions" ON messaging_permissions FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid())';
  END IF;

  -- Social Connections Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_connections' AND policyname = 'Users can manage their own social connections') THEN
    EXECUTE 'CREATE POLICY "Users can manage their own social connections" ON social_connections FOR ALL USING (user_id = auth.uid())';
  END IF;
END
$$;

-- =====================================================
-- MIGRATION 2: DATA MIGRATION
-- =====================================================

-- Create backup table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup_v2') THEN
    CREATE TABLE profiles_backup_v2 AS SELECT * FROM public.profiles;
  END IF;
END
$$;

-- Initialize search quotas for all existing users
INSERT INTO public.search_quotas (user_id, date, searches_used, search_limit)
SELECT 
  id,
  CURRENT_DATE,
  0,
  CASE 
    WHEN subscription_tier = 'premium' THEN 999999
    ELSE 3
  END
FROM public.profiles
ON CONFLICT (user_id, date) DO NOTHING;

-- Set default subscription tiers for existing users
UPDATE public.profiles 
SET subscription_tier = COALESCE(subscription_tier, 'free'),
    profile_views_enabled = COALESCE(profile_views_enabled, false),
    all_years_networking = COALESCE(all_years_networking, false),
    last_active = COALESCE(last_active, now());

-- Create messaging permissions for existing friendships
INSERT INTO public.messaging_permissions (sender_id, recipient_id, can_message, reason)
SELECT 
  f.requester_id,
  f.addressee_id,
  true,
  'mutual_connection'
FROM public.friendships f
WHERE f.status = 'accepted'
UNION
SELECT 
  f.addressee_id,
  f.requester_id,
  true,
  'mutual_connection'
FROM public.friendships f
WHERE f.status = 'accepted'
ON CONFLICT (sender_id, recipient_id) DO NOTHING;

-- =====================================================
-- MIGRATION 3: ESSENTIAL RPC FUNCTIONS
-- =====================================================

-- Function to increment search usage
CREATE OR REPLACE FUNCTION increment_search_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_quotas (user_id, date, searches_used, search_limit, earned_searches)
  VALUES (
    p_user_id, 
    CURRENT_DATE, 
    1, 
    CASE 
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND subscription_tier = 'premium')
      THEN 999999 
      ELSE 3 
    END,
    0
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    searches_used = search_quotas.searches_used + 1,
    last_search_at = now();
END;
$$;

-- Function to check if user can message another user
CREATE OR REPLACE FUNCTION can_user_message(sender_id uuid, recipient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Premium users can message anyone
    SELECT 1 FROM profiles 
    WHERE id = sender_id 
    AND subscription_tier = 'premium'
  ) OR EXISTS (
    -- Free users can message if permission exists
    SELECT 1 FROM messaging_permissions
    WHERE messaging_permissions.sender_id = $1
    AND messaging_permissions.recipient_id = $2
    AND can_message = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Function to get user's premium features
CREATE OR REPLACE FUNCTION get_user_premium_features(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN p.subscription_tier = 'premium' THEN
      '["unlimited_schools", "unlimited_searches", "unlimited_messaging", "profile_analytics", "all_years_networking"]'::jsonb
    WHEN p.subscription_tier = 'enterprise' THEN
      '["unlimited_schools", "unlimited_searches", "unlimited_messaging", "profile_analytics", "all_years_networking", "admin_tools"]'::jsonb
    ELSE
      '[]'::jsonb
  END
  FROM profiles p
  WHERE p.id = p_user_id;
$$;

-- Function to get profile analytics for premium users
CREATE OR REPLACE FUNCTION get_profile_analytics(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_user_id 
      AND subscription_tier IN ('premium', 'enterprise')
    ) THEN
      json_build_object(
        'total_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id
        ), 0),
        'this_week_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id 
          AND viewed_at > now() - interval '7 days'
        ), 0),
        'this_month_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id 
          AND viewed_at > now() - interval '30 days'
        ), 0),
        'unique_viewers', COALESCE((
          SELECT COUNT(DISTINCT viewer_id) 
          FROM profile_views 
          WHERE viewed_id = p_user_id
        ), 0)
      )::jsonb
    ELSE
      NULL
  END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_search_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_premium_features(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_analytics(uuid) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Create verification function
CREATE OR REPLACE FUNCTION verify_v2_migration()
RETURNS TABLE (
  component text,
  status text,
  success boolean
) 
LANGUAGE sql
AS $$
  -- Check tables exist
  SELECT 
    'Tables Created' as component,
    'user_education, profile_views, search_quotas, messaging_permissions created' as status,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_education') 
    AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_views')
    AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'search_quotas')
    AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'messaging_permissions') as success
  
  UNION ALL
  
  -- Check profiles updated
  SELECT 
    'Profiles Updated',
    'subscription_tier and related columns added to profiles',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') as success
    
  UNION ALL
  
  -- Check functions created
  SELECT 
    'Functions Created',
    'Essential RPC functions available',
    EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'increment_search_usage') 
    AND EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'can_user_message')
    AND EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_premium_features') as success
    
  UNION ALL
  
  -- Check search quotas initialized
  SELECT 
    'Data Migrated',
    'Search quotas and messaging permissions initialized',
    (SELECT COUNT(*) FROM search_quotas) > 0 as success;
$$;

-- Run verification
SELECT * FROM verify_v2_migration();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎉 RECONNECT HIVE V2 MIGRATION COMPLETED! 🎉';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: node scripts/test-v2-features.js';
  RAISE NOTICE '2. Run: node scripts/create-sample-data.js';  
  RAISE NOTICE '3. Test at: http://localhost:8080';
END
$$;