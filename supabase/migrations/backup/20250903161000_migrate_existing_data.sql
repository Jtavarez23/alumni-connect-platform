-- Data Migration Script for V2 Multi-School Architecture
-- This script safely migrates existing user data to the new schema

-- STEP 1: Backup existing data (create backup tables)
CREATE TABLE profiles_backup_v2 AS 
SELECT * FROM public.profiles;

-- STEP 2: Migrate existing school_id relationships to user_education table
-- Only migrate users who have school_id set
INSERT INTO public.user_education (
  user_id, 
  school_id, 
  start_year, 
  end_year, 
  is_primary, 
  is_graduated, 
  role_type,
  verification_status,
  created_at
)
SELECT 
  p.id as user_id,
  p.school_id,
  COALESCE(p.graduation_year - 4, 2020) as start_year, -- Assume 4-year program if graduation year exists
  p.graduation_year as end_year,
  true as is_primary, -- First school is primary
  true as is_graduated,
  'student' as role_type,
  CASE 
    WHEN p.verification_status = 'verified' THEN 'verified'
    WHEN p.verification_status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END as verification_status,
  p.created_at
FROM public.profiles p
WHERE p.school_id IS NOT NULL
AND p.graduation_year IS NOT NULL
ON CONFLICT (user_id, school_id, start_year) DO NOTHING;

-- STEP 3: Set subscription tiers based on existing subscription_status
UPDATE public.profiles 
SET subscription_tier = CASE 
  WHEN subscription_status = 'premium' THEN 'premium'
  WHEN subscription_status = 'school' THEN 'enterprise'
  ELSE 'free'
END,
profile_views_enabled = CASE 
  WHEN subscription_status IN ('premium', 'school') THEN true
  ELSE false
END,
all_years_networking = CASE 
  WHEN subscription_status IN ('premium', 'school') THEN true
  ELSE false
END;

-- STEP 4: Initialize search quotas for all users
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

-- STEP 5: Create messaging permissions for existing friendships
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

-- STEP 6: Create user_school_access records for existing relationships
INSERT INTO public.user_school_access (user_id, school_id, access_type, can_view_all_years)
SELECT 
  ue.user_id,
  ue.school_id,
  CASE 
    WHEN p.subscription_tier = 'premium' THEN 'premium'
    ELSE 'free'
  END,
  p.all_years_networking
FROM public.user_education ue
JOIN public.profiles p ON p.id = ue.user_id
ON CONFLICT (user_id, school_id) DO NOTHING;

-- STEP 7: Initialize activity feed with recent profile updates
INSERT INTO public.activity_feed (user_id, activity_type, content_data, school_context, created_at)
SELECT 
  p.id,
  'profile_update',
  json_build_object(
    'type', 'initial_migration',
    'name', p.first_name || ' ' || p.last_name
  )::jsonb,
  ue.school_id,
  p.updated_at
FROM public.profiles p
JOIN public.user_education ue ON ue.user_id = p.id AND ue.is_primary = true
WHERE p.updated_at > now() - interval '30 days';

-- STEP 8: Create default group chats for graduation years
INSERT INTO public.group_chats (name, description, school_id, graduation_year, privacy_level)
SELECT DISTINCT
  s.name || ' Class of ' || ue.end_year,
  'Official group chat for ' || s.name || ' Class of ' || ue.end_year,
  ue.school_id,
  ue.end_year,
  'school_only'
FROM public.user_education ue
JOIN public.schools s ON s.id = ue.school_id
WHERE ue.is_graduated = true
AND ue.end_year IS NOT NULL
AND ue.role_type = 'student'
GROUP BY s.name, ue.school_id, ue.end_year
HAVING COUNT(*) >= 3; -- Only create groups with at least 3 potential members

-- STEP 9: Add users to their graduation year group chats
INSERT INTO public.group_chat_members (group_id, user_id)
SELECT DISTINCT
  gc.id,
  ue.user_id
FROM public.group_chats gc
JOIN public.user_education ue ON ue.school_id = gc.school_id AND ue.end_year = gc.graduation_year
WHERE ue.is_graduated = true
AND ue.role_type = 'student'
ON CONFLICT (group_id, user_id) DO NOTHING;

-- STEP 10: Update friendships table with connection context
UPDATE public.friendships 
SET connection_context = (
  SELECT json_build_object(
    'school_overlap', get_network_overlap(friendships.requester_id, friendships.addressee_id)
  )::jsonb
)
WHERE status = 'accepted';

-- STEP 11: Create verification function to check migration success
CREATE OR REPLACE FUNCTION verify_migration_v2()
RETURNS TABLE (
  check_name text,
  status text,
  count_before bigint,
  count_after bigint,
  success boolean
) 
LANGUAGE sql
AS $$
  -- Check user_education migration
  SELECT 
    'user_education_migration' as check_name,
    'Users with school_id migrated to user_education' as status,
    (SELECT COUNT(*) FROM profiles_backup_v2 WHERE school_id IS NOT NULL) as count_before,
    (SELECT COUNT(*) FROM user_education) as count_after,
    (SELECT COUNT(*) FROM profiles_backup_v2 WHERE school_id IS NOT NULL) = (SELECT COUNT(*) FROM user_education) as success
  
  UNION ALL
  
  -- Check subscription tier migration
  SELECT 
    'subscription_tier_migration',
    'Subscription tiers updated',
    (SELECT COUNT(*) FROM profiles_backup_v2 WHERE subscription_status != 'free') as count_before,
    (SELECT COUNT(*) FROM profiles WHERE subscription_tier != 'free') as count_after,
    (SELECT COUNT(*) FROM profiles_backup_v2 WHERE subscription_status != 'free') = (SELECT COUNT(*) FROM profiles WHERE subscription_tier != 'free') as success
    
  UNION ALL
  
  -- Check search quotas initialized
  SELECT 
    'search_quotas_initialized',
    'Search quotas created for all users',
    (SELECT COUNT(*) FROM profiles) as count_before,
    (SELECT COUNT(DISTINCT user_id) FROM search_quotas) as count_after,
    (SELECT COUNT(*) FROM profiles) = (SELECT COUNT(DISTINCT user_id) FROM search_quotas) as success
    
  UNION ALL
  
  -- Check messaging permissions for friendships
  SELECT 
    'messaging_permissions_created',
    'Messaging permissions for accepted friendships',
    (SELECT COUNT(*) * 2 FROM friendships WHERE status = 'accepted') as count_before,
    (SELECT COUNT(*) FROM messaging_permissions WHERE reason = 'mutual_connection') as count_after,
    (SELECT COUNT(*) * 2 FROM friendships WHERE status = 'accepted') = (SELECT COUNT(*) FROM messaging_permissions WHERE reason = 'mutual_connection') as success;
$$;

-- STEP 12: Run verification
SELECT * FROM verify_migration_v2();

-- STEP 13: Create post-migration cleanup function (run after verification)
CREATE OR REPLACE FUNCTION cleanup_migration_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if migration verification passes
  IF (SELECT bool_and(success) FROM verify_migration_v2()) THEN
    -- Remove backup tables after successful verification
    -- DROP TABLE IF EXISTS profiles_backup_v2;
    
    -- Note: Keeping backup tables for now - admin can drop them manually after confirming
    -- everything works correctly in production
    
    -- Update any remaining null subscription_tiers
    UPDATE profiles 
    SET subscription_tier = 'free' 
    WHERE subscription_tier IS NULL;
    
    -- Set default search quota reset dates
    UPDATE profiles 
    SET search_quota_reset_date = CURRENT_DATE
    WHERE search_quota_reset_date IS NULL;
    
    -- Initialize last_active for existing users
    UPDATE profiles 
    SET last_active = COALESCE(updated_at, created_at)
    WHERE last_active IS NULL;
    
    RAISE NOTICE 'Migration cleanup completed successfully';
  ELSE
    RAISE EXCEPTION 'Migration verification failed. Check verify_migration_v2() results.';
  END IF;
END;
$$;

-- Instructions for manual execution:
-- 1. Run this migration
-- 2. Check the results of verify_migration_v2()
-- 3. If all checks pass, run: SELECT cleanup_migration_v2();
-- 4. Test the application thoroughly
-- 5. Once confirmed working, manually drop backup tables

COMMENT ON FUNCTION verify_migration_v2() IS 'Verifies that the V2 migration completed successfully';
COMMENT ON FUNCTION cleanup_migration_v2() IS 'Cleans up after successful V2 migration - run only after verification passes';