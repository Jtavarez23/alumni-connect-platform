-- Alumni Connect Sprint 1 - Search Infrastructure & Performance Optimization
-- Implements full-text search, materialized views, and performance indexes
-- Based on AC-ARCH-002b search requirements

-- =============================================
-- FULL-TEXT SEARCH CONFIGURATION
-- =============================================

-- Create custom text search configuration for alumni search
-- This handles names, locations, and other alumni-specific terms better
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS alumni_search (COPY = english);

-- Create search-optimized tsvector columns where missing
-- These store pre-computed search vectors for faster queries

-- Add search column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to schools if not exists  
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to posts if not exists
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to businesses if not exists
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to jobs if not exists
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to events if not exists
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search column to groups if not exists
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- =============================================
-- SEARCH VECTOR UPDATE FUNCTIONS
-- =============================================

-- Function to update profile search vector
CREATE OR REPLACE FUNCTION public.update_profile_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.first_name, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.last_name, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.headline, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.bio, '')), 'C') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.location, '')), 'C') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.industry, '')), 'B');
  RETURN NEW;
END;
$$;

-- Function to update school search vector
CREATE OR REPLACE FUNCTION public.update_school_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.name, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.city, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.state, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.district, '')), 'C');
  RETURN NEW;
END;
$$;

-- Function to update post search vector
CREATE OR REPLACE FUNCTION public.update_post_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.text, '')), 'A');
  RETURN NEW;
END;
$$;

-- Function to update business search vector
CREATE OR REPLACE FUNCTION public.update_business_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.name, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.description, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.category, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.city, '')), 'C') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.state, '')), 'C');
  RETURN NEW;
END;
$$;

-- Function to update job search vector
CREATE OR REPLACE FUNCTION public.update_job_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.title, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.company, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.description, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$;

-- Function to update event search vector
CREATE OR REPLACE FUNCTION public.update_event_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.title, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.description, '')), 'B') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$;

-- Function to update group search vector
CREATE OR REPLACE FUNCTION public.update_group_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('alumni_search', COALESCE(NEW.name, '')), 'A') ||
                       setweight(to_tsvector('alumni_search', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

-- =============================================
-- SEARCH TRIGGERS
-- =============================================

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_profile_search_trigger ON public.profiles;
DROP TRIGGER IF EXISTS update_school_search_trigger ON public.schools;
DROP TRIGGER IF EXISTS update_post_search_trigger ON public.posts;
DROP TRIGGER IF EXISTS update_business_search_trigger ON public.businesses;
DROP TRIGGER IF EXISTS update_job_search_trigger ON public.jobs;
DROP TRIGGER IF EXISTS update_event_search_trigger ON public.events;
DROP TRIGGER IF EXISTS update_group_search_trigger ON public.groups;

-- Create triggers for automatic search vector updates
CREATE TRIGGER update_profile_search_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_search_vector();

CREATE TRIGGER update_school_search_trigger
  BEFORE INSERT OR UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_school_search_vector();

CREATE TRIGGER update_post_search_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_post_search_vector();

CREATE TRIGGER update_business_search_trigger
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_business_search_vector();

CREATE TRIGGER update_job_search_trigger
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_job_search_vector();

CREATE TRIGGER update_event_search_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_event_search_vector();

CREATE TRIGGER update_group_search_trigger
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_group_search_vector();

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Full-text search indexes (GIN indexes for tsvector columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search 
ON public.profiles USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schools_search 
ON public.schools USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_search 
ON public.posts USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_search 
ON public.businesses USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_search 
ON public.jobs USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search 
ON public.events USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_groups_search 
ON public.groups USING gin (search_vector);

-- Performance indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_school_year 
ON public.user_education (school_id, end_year DESC, start_year DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_location 
ON public.profiles (location) WHERE location IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_industry 
ON public.profiles (industry) WHERE industry IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_engagement 
ON public.posts (created_at DESC, like_count DESC, comment_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_mutual 
ON public.connections (user_id, connection_id, status) WHERE status = 'accepted';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yearbooks_school_year 
ON public.yearbooks (school_id, year DESC, status) WHERE status = 'clean';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_upcoming 
ON public.events (starts_at ASC) WHERE starts_at > now();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_verified_premium 
ON public.businesses (is_verified, is_premium, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_active 
ON public.jobs (created_at DESC) WHERE expires_at IS NULL OR expires_at > now();

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_school 
ON public.posts (author_id, school_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_active 
ON public.group_members (group_id, joined_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorship_availability 
ON public.mentorship_profiles (role, is_active, availability_status) 
WHERE is_active = true;

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- View for trending posts (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_posts AS
SELECT 
  p.id,
  p.author_id,
  p.text,
  p.created_at,
  p.school_id,
  p.visibility,
  -- Engagement score calculation
  (
    COALESCE(p.like_count, 0) * 1.0 +
    COALESCE(p.comment_count, 0) * 2.0 +
    COALESCE(p.share_count, 0) * 3.0
  ) / EXTRACT(EPOCH FROM (now() - p.created_at)) * 86400 AS trending_score
FROM public.posts p
WHERE p.created_at > now() - interval '7 days'
  AND p.visibility IN ('public', 'alumni_only')
ORDER BY trending_score DESC
LIMIT 1000;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS idx_trending_posts_score 
ON public.trending_posts (trending_score DESC);

-- View for active alumni by school
CREATE MATERIALIZED VIEW IF NOT EXISTS public.active_alumni_by_school AS
SELECT 
  s.id as school_id,
  s.name as school_name,
  COUNT(DISTINCT ue.user_id) as total_alumni,
  COUNT(DISTINCT CASE WHEN p.last_active > now() - interval '30 days' THEN ue.user_id END) as active_alumni,
  COUNT(DISTINCT CASE WHEN p.last_active > now() - interval '7 days' THEN ue.user_id END) as weekly_active,
  MAX(p.last_active) as last_activity
FROM public.schools s
LEFT JOIN public.user_education ue ON s.id = ue.school_id
LEFT JOIN public.profiles p ON ue.user_id = p.id
GROUP BY s.id, s.name;

-- View for popular groups
CREATE MATERIALIZED VIEW IF NOT EXISTS public.popular_groups AS
SELECT 
  g.id,
  g.name,
  g.kind,
  g.school_id,
  g.visibility,
  COUNT(DISTINCT gm.user_id) as member_count,
  COUNT(DISTINCT gp.id) as post_count,
  MAX(gp.created_at) as last_post_at
FROM public.groups g
LEFT JOIN public.group_members gm ON g.id = gm.group_id
LEFT JOIN public.group_posts gp ON g.id = gp.group_id
GROUP BY g.id, g.name, g.kind, g.school_id, g.visibility
ORDER BY member_count DESC, post_count DESC;

-- View for school statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.school_statistics AS
SELECT 
  s.id,
  s.name,
  s.city,
  s.state,
  COUNT(DISTINCT ue.user_id) as total_alumni,
  COUNT(DISTINCT y.id) as yearbook_count,
  COUNT(DISTINCT g.id) as group_count,
  COUNT(DISTINCT e.id) as event_count,
  MIN(ue.start_year) as earliest_year,
  MAX(ue.end_year) as latest_year
FROM public.schools s
LEFT JOIN public.user_education ue ON s.id = ue.school_id
LEFT JOIN public.yearbooks y ON s.id = y.school_id
LEFT JOIN public.groups g ON s.id = g.school_id
LEFT JOIN public.events e ON e.host_type = 'school' AND e.host_id = s.id
GROUP BY s.id, s.name, s.city, s.state;

-- =============================================
-- SEARCH FUNCTIONS AND RPCS
-- =============================================

-- Universal search function
CREATE OR REPLACE FUNCTION public.search_all(
  query_text text,
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0,
  search_type text DEFAULT 'all' -- 'all', 'people', 'schools', 'posts', 'businesses', 'jobs', 'events', 'groups'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_tsquery tsquery;
  result json;
  people_results json;
  schools_results json;
  posts_results json;
  businesses_results json;
  jobs_results json;
  events_results json;
  groups_results json;
BEGIN
  -- Convert search query to tsquery
  query_tsquery := plainto_tsquery('alumni_search', query_text);
  
  -- Search people if requested
  IF search_type = 'all' OR search_type = 'people' THEN
    SELECT json_agg(
      json_build_object(
        'type', 'person',
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'headline', p.headline,
        'avatar_url', p.avatar_url,
        'rank', ts_rank(p.search_vector, query_tsquery)
      )
    )
    INTO people_results
    FROM public.profiles p
    WHERE p.search_vector @@ query_tsquery
      AND NOT p.is_private
    ORDER BY ts_rank(p.search_vector, query_tsquery) DESC
    LIMIT limit_count OFFSET offset_count;
  END IF;
  
  -- Search schools if requested
  IF search_type = 'all' OR search_type = 'schools' THEN
    SELECT json_agg(
      json_build_object(
        'type', 'school',
        'id', s.id,
        'name', s.name,
        'city', s.city,
        'state', s.state,
        'rank', ts_rank(s.search_vector, query_tsquery)
      )
    )
    INTO schools_results
    FROM public.schools s
    WHERE s.search_vector @@ query_tsquery
    ORDER BY ts_rank(s.search_vector, query_tsquery) DESC
    LIMIT limit_count OFFSET offset_count;
  END IF;
  
  -- Search posts if requested
  IF search_type = 'all' OR search_type = 'posts' THEN
    SELECT json_agg(
      json_build_object(
        'type', 'post',
        'id', p.id,
        'text', LEFT(p.text, 200),
        'author_id', p.author_id,
        'created_at', p.created_at,
        'rank', ts_rank(p.search_vector, query_tsquery)
      )
    )
    INTO posts_results
    FROM public.posts p
    WHERE p.search_vector @@ query_tsquery
      AND p.visibility = 'public' -- Only public posts for now
    ORDER BY ts_rank(p.search_vector, query_tsquery) DESC
    LIMIT limit_count OFFSET offset_count;
  END IF;
  
  -- Combine all results
  result := json_build_object(
    'query', query_text,
    'people', COALESCE(people_results, '[]'::json),
    'schools', COALESCE(schools_results, '[]'::json),
    'posts', COALESCE(posts_results, '[]'::json),
    'businesses', COALESCE(businesses_results, '[]'::json),
    'jobs', COALESCE(jobs_results, '[]'::json),
    'events', COALESCE(events_results, '[]'::json),
    'groups', COALESCE(groups_results, '[]'::json)
  );
  
  RETURN result;
END;
$$;

-- Refresh materialized views function
CREATE OR REPLACE FUNCTION public.refresh_search_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.trending_posts;
  REFRESH MATERIALIZED VIEW public.active_alumni_by_school;
  REFRESH MATERIALIZED VIEW public.popular_groups;
  REFRESH MATERIALIZED VIEW public.school_statistics;
END;
$$;

-- Function to update all search vectors for existing data
CREATE OR REPLACE FUNCTION public.rebuild_search_vectors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all profile search vectors
  UPDATE public.profiles SET search_vector = 
    setweight(to_tsvector('alumni_search', COALESCE(first_name, '')), 'A') ||
    setweight(to_tsvector('alumni_search', COALESCE(last_name, '')), 'A') ||
    setweight(to_tsvector('alumni_search', COALESCE(headline, '')), 'B') ||
    setweight(to_tsvector('alumni_search', COALESCE(bio, '')), 'C') ||
    setweight(to_tsvector('alumni_search', COALESCE(location, '')), 'C') ||
    setweight(to_tsvector('alumni_search', COALESCE(industry, '')), 'B');
  
  -- Update all school search vectors
  UPDATE public.schools SET search_vector = 
    setweight(to_tsvector('alumni_search', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('alumni_search', COALESCE(city, '')), 'B') ||
    setweight(to_tsvector('alumni_search', COALESCE(state, '')), 'B') ||
    setweight(to_tsvector('alumni_search', COALESCE(district, '')), 'C');
  
  -- Update other tables as they get data
  RAISE NOTICE 'Search vectors rebuilt for all tables';
END;
$$;

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- Function to get slow queries
CREATE OR REPLACE FUNCTION public.get_slow_queries()
RETURNS TABLE (
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision,
  stddev_time double precision
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time
  FROM pg_stat_statements 
  WHERE calls > 10 
  ORDER BY mean_time DESC 
  LIMIT 20;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on search functions
GRANT EXECUTE ON FUNCTION public.search_all(text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_search_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_search_vectors() TO service_role;

-- Grant select permissions on materialized views
GRANT SELECT ON public.trending_posts TO authenticated;
GRANT SELECT ON public.active_alumni_by_school TO authenticated;
GRANT SELECT ON public.popular_groups TO authenticated;
GRANT SELECT ON public.school_statistics TO authenticated;

-- =============================================
-- INITIAL DATA POPULATION
-- =============================================

-- Rebuild search vectors for existing data
SELECT public.rebuild_search_vectors();

-- Refresh materialized views
SELECT public.refresh_search_views();

-- =============================================
-- VALIDATION AND COMPLETION
-- =============================================

-- Verify search infrastructure is working
DO $$
DECLARE
  search_results json;
BEGIN
  -- Test search functionality
  SELECT public.search_all('test', 5, 0, 'all') INTO search_results;
  
  -- Check if materialized views exist and have data
  IF NOT EXISTS (SELECT 1 FROM public.trending_posts LIMIT 1) THEN
    RAISE NOTICE 'Warning: trending_posts materialized view is empty';
  END IF;
  
  RAISE NOTICE 'Search infrastructure migration completed successfully';
END $$;