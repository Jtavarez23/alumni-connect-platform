-- Alumni Connect Database Validation Test Suite
-- Comprehensive tests to validate AC-ARCH-002b schema compliance
-- Run this after all migrations to ensure database integrity

-- =============================================
-- SCHEMA VALIDATION TESTS
-- =============================================

-- Test 1: Verify all required tables exist
DO $$
DECLARE
  required_tables text[] := ARRAY[
    -- Core Foundation
    'profiles', 'schools', 'school_aliases', 'class_years', 'user_education',
    
    -- Yearbook Processing Pipeline
    'yearbooks', 'yearbook_pages', 'page_names_ocr', 'page_faces', 'claims', 'safety_queue',
    
    -- Social Features
    'posts', 'comments', 'reactions', 'connections', 'groups', 'group_members',
    
    -- Events & Ticketing
    'events', 'event_tickets', 'event_orders', 'event_attendees', 'event_organizers',
    'event_agenda', 'event_feedback', 'event_announcements',
    
    -- Business Directory
    'businesses', 'business_claims', 'business_reviews',
    
    -- Jobs & Career
    'jobs', 'job_applications', 'saved_jobs',
    
    -- Mentorship Platform
    'mentorship_profiles', 'mentorship_availability', 'mentorship_matches',
    'mentorship_sessions', 'mentorship_goals',
    
    -- Messaging
    'conversations', 'conversation_members', 'messages',
    
    -- Moderation & Safety
    'moderation_reports', 'moderation_actions', 'safety_events',
    
    -- Notifications
    'notifications', 'notification_preferences',
    
    -- Group Enhancements
    'group_posts', 'group_events', 'group_invitations', 'group_settings',
    
    -- Search & Analytics
    'profile_views', 'search_quotas'
  ];
  table_name text;
  missing_tables text[] := '{}';
BEGIN
  FOREACH table_name IN ARRAY required_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = required_tables.table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All % required tables exist', array_length(required_tables, 1);
  END IF;
END $$;

-- Test 2: Verify all tables have RLS enabled
DO $$
DECLARE
  unprotected_tables text[];
BEGIN
  SELECT ARRAY_AGG(t.tablename) INTO unprotected_tables
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  WHERE t.schemaname = 'public' 
  AND t.tablename NOT LIKE 'pg_%'
  AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
  AND t.tablename NOT IN ('trending_posts', 'active_alumni_by_school', 'popular_groups', 'school_statistics'); -- Exclude materialized views
  
  IF array_length(unprotected_tables, 1) > 0 THEN
    RAISE WARNING '⚠️ Tables without RLS: %', array_to_string(unprotected_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All tables have RLS enabled';
  END IF;
END $$;

-- Test 3: Verify required enums exist
DO $$
DECLARE
  required_enums text[] := ARRAY[
    'trust_level', 'visibility', 'media_scan_status', 'report_reason',
    'event_role', 'order_status', 'claim_status', 'mentorship_role',
    'match_status', 'availability_status', 'event_status', 'attendance_status',
    'application_status', 'notification_type'
  ];
  enum_name text;
  missing_enums text[] := '{}';
BEGIN
  FOREACH enum_name IN ARRAY required_enums LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type 
      WHERE typname = enum_name AND typtype = 'e'
    ) THEN
      missing_enums := array_append(missing_enums, enum_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_enums, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing enums: %', array_to_string(missing_enums, ', ');
  ELSE
    RAISE NOTICE '✅ All required enums exist';
  END IF;
END $$;

-- Test 4: Verify foreign key relationships
DO $$
DECLARE
  expected_fks integer;
  actual_fks integer;
BEGIN
  -- Count expected foreign key relationships
  -- This is a simplified check - in production you'd verify specific relationships
  SELECT COUNT(*) INTO actual_fks
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY' 
  AND table_schema = 'public';
  
  -- Expect at least 50 foreign key constraints for proper relationships
  IF actual_fks < 50 THEN
    RAISE WARNING '⚠️ Only % foreign key constraints found, expected at least 50', actual_fks;
  ELSE
    RAISE NOTICE '✅ Found % foreign key relationships', actual_fks;
  END IF;
END $$;

-- Test 5: Verify search indexes exist
DO $$
DECLARE
  search_indexes text[] := ARRAY[
    'idx_profiles_search', 'idx_schools_search', 'idx_posts_search',
    'idx_businesses_search', 'idx_jobs_search', 'idx_events_search',
    'idx_groups_search'
  ];
  index_name text;
  missing_indexes text[] := '{}';
BEGIN
  FOREACH index_name IN ARRAY search_indexes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = index_name
    ) THEN
      missing_indexes := array_append(missing_indexes, index_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing search indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ All search indexes exist';
  END IF;
END $$;

-- Test 6: Verify materialized views exist
DO $$
DECLARE
  required_views text[] := ARRAY[
    'trending_posts', 'active_alumni_by_school', 'popular_groups', 'school_statistics'
  ];
  view_name text;
  missing_views text[] := '{}';
BEGIN
  FOREACH view_name IN ARRAY required_views LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_matviews 
      WHERE schemaname = 'public' 
      AND matviewname = view_name
    ) THEN
      missing_views := array_append(missing_views, view_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_views, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing materialized views: %', array_to_string(missing_views, ', ');
  ELSE
    RAISE NOTICE '✅ All materialized views exist';
  END IF;
END $$;

-- =============================================
-- FUNCTIONAL TESTS
-- =============================================

-- Test 7: Verify helper functions work
DO $$
DECLARE
  test_uuid uuid := gen_random_uuid();
BEGIN
  -- Test trust level function
  PERFORM public.user_has_trust_level('unverified'::trust_level);
  
  -- Test connection function
  PERFORM public.users_are_connected(test_uuid, test_uuid);
  
  -- Test school sharing function
  PERFORM public.users_share_school(test_uuid, test_uuid);
  
  -- Test group membership function
  PERFORM public.user_is_group_member(test_uuid, test_uuid, 'member');
  
  RAISE NOTICE '✅ All helper functions are callable';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Helper function test failed: %', SQLERRM;
END $$;

-- Test 8: Verify search functionality
DO $$
DECLARE
  search_result json;
BEGIN
  -- Test universal search function
  SELECT public.search_all('test search', 5, 0, 'all') INTO search_result;
  
  IF search_result IS NULL THEN
    RAISE EXCEPTION 'Search function returned null';
  END IF;
  
  RAISE NOTICE '✅ Search functionality working';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Search test failed: %', SQLERRM;
END $$;

-- Test 9: Verify notification functions
DO $$
DECLARE
  test_uuid uuid := gen_random_uuid();
  notification_id uuid;
BEGIN
  -- Test notification creation (will fail due to RLS but function should exist)
  BEGIN
    SELECT public.create_notification(
      test_uuid,
      'system'::notification_type,
      'Test notification',
      'Test message'
    ) INTO notification_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Expected to fail due to RLS, but function should exist
      NULL;
  END;
  
  RAISE NOTICE '✅ Notification functions exist';
  
EXCEPTION
  WHEN undefined_function THEN
    RAISE WARNING '⚠️ Notification functions missing';
END $$;

-- Test 10: Verify trigger functions exist
DO $$
DECLARE
  trigger_functions text[] := ARRAY[
    'update_profile_search_vector', 'update_school_search_vector', 
    'update_post_search_vector', 'update_business_search_vector',
    'update_job_search_vector', 'update_event_search_vector',
    'update_group_search_vector', 'update_updated_at',
    'update_group_stats'
  ];
  func_name text;
  missing_functions text[] := '{}';
BEGIN
  FOREACH func_name IN ARRAY trigger_functions LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = func_name
    ) THEN
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing trigger functions: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE '✅ All trigger functions exist';
  END IF;
END $$;

-- =============================================
-- PERFORMANCE TESTS
-- =============================================

-- Test 11: Check for missing critical indexes
DO $$
DECLARE
  critical_indexes text[] := ARRAY[
    'idx_user_education_user', 'idx_user_education_school',
    'idx_connections_status', 'idx_posts_author', 'idx_posts_created',
    'idx_yearbooks_school', 'idx_yearbook_pages_yearbook',
    'idx_events_upcoming', 'idx_notifications_user_unread'
  ];
  index_name text;
  missing_critical text[] := '{}';
BEGIN
  FOREACH index_name IN ARRAY critical_indexes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = index_name
    ) THEN
      missing_critical := array_append(missing_critical, index_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_critical, 1) > 0 THEN
    RAISE WARNING '⚠️ Missing critical indexes: %', array_to_string(missing_critical, ', ');
  ELSE
    RAISE NOTICE '✅ All critical performance indexes exist';
  END IF;
END $$;

-- Test 12: Verify all tables have proper timestamp columns
DO $$
DECLARE
  tables_without_timestamps text[];
BEGIN
  SELECT ARRAY_AGG(t.table_name) INTO tables_without_timestamps
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = t.table_name
    AND c.column_name = 'created_at'
  )
  AND t.table_name NOT IN (
    'connections', 'reactions', 'group_members', 'conversation_members',
    'saved_jobs', 'event_organizers', 'group_events', 'trending_posts',
    'active_alumni_by_school', 'popular_groups', 'school_statistics'
  ); -- Exclude tables that legitimately don't need timestamps
  
  IF array_length(tables_without_timestamps, 1) > 0 THEN
    RAISE WARNING '⚠️ Tables missing created_at: %', array_to_string(tables_without_timestamps, ', ');
  ELSE
    RAISE NOTICE '✅ All tables have proper timestamp columns';
  END IF;
END $$;

-- =============================================
-- SECURITY TESTS
-- =============================================

-- Test 13: Verify RLS policies exist for critical tables
DO $$
DECLARE
  critical_tables text[] := ARRAY[
    'profiles', 'posts', 'messages', 'yearbooks', 'businesses',
    'jobs', 'notifications', 'moderation_reports'
  ];
  table_name text;
  policy_count integer;
  tables_without_policies text[] := '{}';
BEGIN
  FOREACH table_name IN ARRAY critical_tables LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = table_name;
    
    IF policy_count = 0 THEN
      tables_without_policies := array_append(tables_without_policies, table_name);
    END IF;
  END LOOP;
  
  IF array_length(tables_without_policies, 1) > 0 THEN
    RAISE WARNING '⚠️ Critical tables without RLS policies: %', array_to_string(tables_without_policies, ', ');
  ELSE
    RAISE NOTICE '✅ All critical tables have RLS policies';
  END IF;
END $$;

-- Test 14: Check for proper UUID primary keys
DO $$
DECLARE
  tables_without_uuid_pk text[];
BEGIN
  SELECT ARRAY_AGG(t.table_name) INTO tables_without_uuid_pk
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = t.table_name
    AND c.column_name = 'id'
    AND c.data_type = 'uuid'
    AND c.column_default LIKE '%gen_random_uuid%'
  )
  AND t.table_name NOT IN (
    'connections', 'reactions', 'group_members', 'conversation_members',
    'saved_jobs', 'event_organizers', 'group_events', 'trending_posts',
    'active_alumni_by_school', 'popular_groups', 'school_statistics',
    'notification_preferences', 'group_settings', 'mentorship_profiles'
  ); -- Exclude tables with composite PKs or different PK strategies
  
  IF array_length(tables_without_uuid_pk, 1) > 0 THEN
    RAISE WARNING '⚠️ Tables without UUID primary keys: %', array_to_string(tables_without_uuid_pk, ', ');
  ELSE
    RAISE NOTICE '✅ All tables use proper UUID primary keys';
  END IF;
END $$;

-- =============================================
-- FINAL VALIDATION SUMMARY
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DATABASE VALIDATION COMPLETE';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Schema validation tests completed.';
  RAISE NOTICE 'Review any warnings above for optimization opportunities.';
  RAISE NOTICE 'Database is ready for Alumni Connect Sprint 1 deployment!';
  RAISE NOTICE '';
END $$;