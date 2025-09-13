-- Test query that was failing with 406 (Not Acceptable) error
-- This simulates the exact query from the Alumni Connect dashboard

-- Test the query that was failing:
-- GET https://dyhloaxsdcfgfyfhrdfc.supabase.co/rest/v1/social_proof_metrics?select=*&user_id=eq.b99870dc-6821-4b7b-985b-02c0df497b69&school_id=eq.c9052f67-a349-4f89-8e02-e0fc453fc09c 406 (Not Acceptable)

SELECT 
  'TEST: Original failing query' as test_name,
  *
FROM public.social_proof_metrics 
WHERE user_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid 
  AND school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;

-- Test all the related queries that the SocialProofWidget makes:

-- 1. User education query (for recent joins)
SELECT 
  'TEST: Recent joins query' as test_name,
  ue.user_id,
  ue.created_at,
  p.first_name,
  p.last_name,
  p.avatar_url
FROM public.user_education ue
JOIN public.profiles p ON p.id = ue.user_id
WHERE ue.school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
  AND ue.user_id != 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid
ORDER BY ue.created_at DESC
LIMIT 5;

-- 2. Live activity query
SELECT 
  'TEST: Live activity query' as test_name,
  COUNT(*) as active_users_count
FROM public.live_activity 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
  AND is_active = true 
  AND last_activity > (now() - interval '5 minutes');

-- 3. Schools query (for total students)
SELECT 
  'TEST: School data query' as test_name,
  total_students
FROM public.schools 
WHERE id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;

-- 4. User education count query
SELECT 
  'TEST: Total joined count query' as test_name,
  COUNT(*) as total_joined
FROM public.user_education 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;

-- 5. Friendships query (mutual connections)
SELECT 
  'TEST: Mutual connections query' as test_name,
  COUNT(*) as mutual_connections
FROM public.friendships 
WHERE (requester_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid OR addressee_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid)
  AND status = 'accepted';

-- 6. Trending content query
SELECT 
  'TEST: Trending content query' as test_name,
  content_id,
  total_reactions,
  content_type
FROM public.trending_content 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
  AND time_period = 'daily'
ORDER BY trending_score DESC
LIMIT 3;

-- Summary test: Check if all tables exist and have data
SELECT 
  'SUMMARY: Table status check' as test_name,
  'social_proof_metrics' as table_name,
  COUNT(*) as row_count
FROM public.social_proof_metrics 
WHERE user_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid 
  AND school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid

UNION ALL

SELECT 
  'SUMMARY: Table status check' as test_name,
  'live_activity' as table_name,
  COUNT(*) as row_count
FROM public.live_activity 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid

UNION ALL

SELECT 
  'SUMMARY: Table status check' as test_name,
  'trending_content' as table_name,
  COUNT(*) as row_count
FROM public.trending_content 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid

ORDER BY table_name;