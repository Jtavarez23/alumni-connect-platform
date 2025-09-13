-- Reconnect Hive V2 Multi-School Architecture Migration
-- This migration implements the comprehensive plan for multi-school support

-- 1. Create user_education table to replace single school_id in profiles
CREATE TABLE public.user_education (
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

-- 2. Update profiles table for subscription tiers and new features
ALTER TABLE public.profiles 
ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
ADD COLUMN profile_views_enabled boolean DEFAULT false,
ADD COLUMN all_years_networking boolean DEFAULT false,
ADD COLUMN last_active timestamptz DEFAULT now(),
ADD COLUMN search_quota_used integer DEFAULT 0,
ADD COLUMN search_quota_reset_date date DEFAULT CURRENT_DATE;

-- 3. Profile Views Tracking (Premium Feature)
CREATE TABLE public.profile_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  view_context text CHECK (view_context IN ('search', 'yearbook', 'group', 'direct', 'suggestion')),
  CONSTRAINT no_self_views CHECK (viewer_id != viewed_id)
);

-- 4. Search Quota System
CREATE TABLE public.search_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  searches_used integer DEFAULT 0,
  search_limit integer DEFAULT 3,
  last_search_at timestamptz,
  searches_detail jsonb DEFAULT '[]',
  earned_searches integer DEFAULT 0, -- Bonus searches from engagement
  UNIQUE(user_id, date)
);

-- 5. Messaging Permissions System
CREATE TABLE public.messaging_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  can_message boolean DEFAULT false,
  reason text CHECK (reason IN ('in_network', 'premium_user', 'mutual_connection', 'same_school_year')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, recipient_id)
);

-- 6. Social Media Connections
CREATE TABLE public.social_connections (
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

-- 7. Classmate Suggestions System
CREATE TABLE public.classmate_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  suggester_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_name text NOT NULL,
  suggested_email text,
  school_id uuid REFERENCES schools(id),
  graduation_year integer,
  additional_details jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'joined', 'rejected')),
  invited_user_id uuid REFERENCES profiles(id),
  verification_reward_given boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- 8. Activity Feed System
CREATE TABLE public.activity_feed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'new_member_joined', 'photo_tagged', 'memory_shared', 'then_vs_now_post',
    'reunion_announcement', 'profile_update', 'group_activity', 'connection_made'
  )),
  content_id uuid, -- References various content types
  content_data jsonb DEFAULT '{}',
  school_context uuid REFERENCES schools(id),
  year_context integer,
  priority_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 9. Group Chats with Limitations
CREATE TABLE public.group_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  school_id uuid REFERENCES schools(id),
  graduation_year integer,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_cross_year boolean DEFAULT false, -- Premium feature
  max_members integer DEFAULT 50,
  privacy_level text CHECK (privacy_level IN ('public', 'school_only', 'invitation_only')) DEFAULT 'school_only',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.group_chat_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 10. User School Access Control
CREATE TABLE public.user_school_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id),
  access_type text CHECK (access_type IN ('free', 'premium')),
  can_view_all_years boolean DEFAULT false,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, school_id)
);

-- 11. Premium Feature Usage Tracking
CREATE TABLE public.feature_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  usage_count integer DEFAULT 1,
  last_used timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  UNIQUE(user_id, feature_name, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classmate_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_school_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_user_education_user_school ON user_education(user_id, school_id);
CREATE INDEX idx_user_education_school_years ON user_education(school_id, start_year, end_year);
CREATE INDEX idx_profile_views_viewer_date ON profile_views(viewer_id, viewed_at DESC);
CREATE INDEX idx_profile_views_viewed_date ON profile_views(viewed_id, viewed_at DESC);
CREATE INDEX idx_search_quotas_user_date ON search_quotas(user_id, date);
CREATE INDEX idx_messaging_permissions_sender ON messaging_permissions(sender_id, can_message);
CREATE INDEX idx_social_connections_user_platform ON social_connections(user_id, platform);
CREATE INDEX idx_suggestions_school_status ON classmate_suggestions(school_id, status);
CREATE INDEX idx_activity_feed_user_created ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_school_priority ON activity_feed(school_context, priority_score DESC);
CREATE INDEX idx_group_members_group_user ON group_chat_members(group_id, user_id);

-- Row-Level Security Policies

-- User Education Policies
CREATE POLICY "Users can manage their own education history" ON user_education
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view education of connected users" ON user_education
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.requester_id = auth.uid() AND f.addressee_id = user_education.user_id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = user_education.user_id)
    AND f.status = 'accepted'
  )
);

-- Profile Views Policies (Premium Feature)
CREATE POLICY "Track profile views for premium users" ON profile_views
FOR INSERT WITH CHECK (
  viewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = viewed_id 
    AND (subscription_tier = 'premium' OR profile_views_enabled = true)
  )
);

CREATE POLICY "Users can view their own profile analytics" ON profile_views
FOR SELECT USING (
  viewed_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (subscription_tier = 'premium' OR profile_views_enabled = true)
  )
);

-- Search Quota Policies
CREATE POLICY "Users can manage their own search quotas" ON search_quotas
FOR ALL USING (user_id = auth.uid());

-- Messaging Permissions Policies
CREATE POLICY "Users can view their messaging permissions" ON messaging_permissions
FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Social Connections Policies
CREATE POLICY "Users can manage their own social connections" ON social_connections
FOR ALL USING (user_id = auth.uid());

-- Classmate Suggestions Policies
CREATE POLICY "Users can create suggestions with limits" ON classmate_suggestions
FOR INSERT WITH CHECK (
  suggester_id = auth.uid() AND
  (SELECT COUNT(*) FROM classmate_suggestions
   WHERE suggester_id = auth.uid()
   AND created_at > now() - interval '7 days') < 
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND subscription_tier = 'premium')
    THEN 999999 
    ELSE 5 
  END
);

CREATE POLICY "Users can view suggestions they made or received" ON classmate_suggestions
FOR SELECT USING (
  suggester_id = auth.uid() OR 
  invited_user_id = auth.uid()
);

-- Activity Feed Policies
CREATE POLICY "Users can view activity from their network" ON activity_feed
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_education ue1
    JOIN user_education ue2 ON ue1.school_id = ue2.school_id
    WHERE ue1.user_id = auth.uid() 
    AND ue2.user_id = activity_feed.user_id
    AND (
      -- Free users: only see same years
      (COALESCE((SELECT subscription_tier FROM profiles WHERE id = auth.uid()), 'free') = 'free' AND 
       ue1.start_year <= ue2.end_year AND 
       ue1.end_year >= ue2.start_year)
      OR
      -- Premium users: see all years
      COALESCE((SELECT subscription_tier FROM profiles WHERE id = auth.uid()), 'free') = 'premium'
    )
  )
);

-- Group Chat Policies
CREATE POLICY "Users can view public and their group chats" ON group_chats
FOR SELECT USING (
  privacy_level = 'public' OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM group_chat_members WHERE group_id = id AND user_id = auth.uid())
);

CREATE POLICY "Users can create group chats" ON group_chats
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group members can view membership" ON group_chat_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM group_chat_members WHERE group_id = group_chat_members.group_id AND user_id = auth.uid())
);

-- Feature Usage Policies
CREATE POLICY "Users can track their own feature usage" ON feature_usage
FOR ALL USING (user_id = auth.uid());

-- Functions for Business Logic

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

-- Function to check user's network overlap
CREATE OR REPLACE FUNCTION get_network_overlap(user1_id uuid, user2_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'school_id', ue1.school_id,
      'school_name', s.name,
      'overlap_years', json_build_array(
        GREATEST(ue1.start_year, ue2.start_year),
        LEAST(ue1.end_year, ue2.end_year)
      )
    )
  ), '[]'::json)::jsonb
  FROM user_education ue1
  JOIN user_education ue2 ON ue1.school_id = ue2.school_id
  JOIN schools s ON s.id = ue1.school_id
  WHERE ue1.user_id = $1 
  AND ue2.user_id = $2
  AND ue1.start_year <= ue2.end_year 
  AND ue1.end_year >= ue2.start_year;
$$;

-- Function to update messaging permissions based on network
CREATE OR REPLACE FUNCTION update_messaging_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When friendship is accepted, create messaging permissions
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO messaging_permissions (sender_id, recipient_id, can_message, reason)
    VALUES 
      (NEW.requester_id, NEW.addressee_id, true, 'mutual_connection'),
      (NEW.addressee_id, NEW.requester_id, true, 'mutual_connection')
    ON CONFLICT (sender_id, recipient_id) DO UPDATE 
    SET can_message = true, reason = 'mutual_connection';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for messaging permissions
CREATE TRIGGER friendship_messaging_permissions
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_permissions();

-- Function to reset daily search quotas
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset search quotas for users whose reset date has passed
  UPDATE profiles 
  SET search_quota_used = 0,
      search_quota_reset_date = CURRENT_DATE
  WHERE search_quota_reset_date < CURRENT_DATE;
  
  -- Clean up old search quota records (keep last 30 days)
  DELETE FROM search_quotas 
  WHERE date < CURRENT_DATE - interval '30 days';
END;
$$;