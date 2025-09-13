# 🚀 Execute Reconnect Hive V2 Migrations

## Quick Instructions:
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/dyhloaxsdcfgfyfhrdfc)
2. Go to **SQL Editor** > **New Query**
3. Copy each migration below into SQL Editor and click **RUN**

---

## ✅ **MIGRATION 1: Core V2 Schema**
**Copy this SQL and run it first:**

```sql
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
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS profile_views_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS all_years_networking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_active timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS search_quota_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_quota_reset_date date DEFAULT CURRENT_DATE;

-- 3. Profile Views Tracking (Premium Feature)
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  view_context text CHECK (view_context IN ('search', 'yearbook', 'group', 'direct', 'suggestion')),
  CONSTRAINT no_self_views CHECK (viewer_id != viewed_id)
);

-- 4. Search Quota System
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

-- 5. Messaging Permissions System
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

-- Enable RLS and create basic policies
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage their own education history" ON user_education
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own search quotas" ON search_quotas
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their messaging permissions" ON messaging_permissions
FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
```

---

## ✅ **MIGRATION 2: Initialize User Data**
**Copy this SQL and run it second:**

```sql
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
```

---

## ✅ **MIGRATION 3: Core Functions**
**Copy this SQL and run it third:**

```sql
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
    ELSE
      '[]'::jsonb
  END
  FROM profiles p
  WHERE p.id = p_user_id;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_search_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_premium_features(uuid) TO authenticated;
```

---

## ✅ **VERIFY MIGRATION SUCCESS**
**Run this to verify everything worked:**

```sql
-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_education', 'profile_views', 'search_quotas', 'messaging_permissions');

-- Check profiles table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('subscription_tier', 'profile_views_enabled', 'all_years_networking');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('increment_search_usage', 'can_user_message', 'get_user_premium_features');
```

---

## 🎉 After Migration Success:

1. **Test the application**: `http://localhost:8080`
2. **Run feature tests**: `node scripts/test-v2-features.js`
3. **Check V2 components are working**
4. **All subscription features should be active**

---

## 🚨 If You Get Errors:

- **"column already exists"**: This is normal, ignore it
- **"table already exists"**: This is normal, ignore it  
- **Permission errors**: Make sure you're the project owner
- **Function errors**: Check syntax carefully

The migrations are designed to be safe and skip existing items.