-- Priority 2 Search Indexes Migration
-- Full-text search triggers and indexes for Events, Businesses, Jobs
-- Based on AC-ARCH-002b search specifications

-- =============================================
-- SEARCH TRIGGER FUNCTIONS
-- =============================================

-- Generic function to update search tsvector
CREATE OR REPLACE FUNCTION public.update_search_vector()
RETURNS trigger AS $$
BEGIN
  -- This function will be used by table-specific triggers
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Businesses search trigger function
CREATE OR REPLACE FUNCTION public.update_businesses_search()
RETURNS trigger AS $$
BEGIN
  NEW.search := to_tsvector('simple', 
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.location, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Jobs search trigger function
CREATE OR REPLACE FUNCTION public.update_jobs_search()
RETURNS trigger AS $$
BEGIN
  NEW.search := to_tsvector('simple',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.company, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.requirements, '') || ' ' ||
    coalesce(NEW.location, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Events search trigger function  
CREATE OR REPLACE FUNCTION public.update_events_search()
RETURNS trigger AS $$
BEGIN
  NEW.search := to_tsvector('simple',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.location, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADD SEARCH COLUMNS
-- =============================================

-- Add search columns to tables
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS search tsvector;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS search tsvector;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS search tsvector;

-- =============================================
-- CREATE SEARCH INDEXES
-- =============================================

-- Businesses search index
CREATE INDEX IF NOT EXISTS businesses_search_idx ON public.businesses USING gin (search);

-- Jobs search index  
CREATE INDEX IF NOT EXISTS jobs_search_idx ON public.jobs USING gin (search);

-- Events search index
CREATE INDEX IF NOT EXISTS events_search_idx ON public.events USING gin (search);

-- Additional functional indexes for better query performance
CREATE INDEX IF NOT EXISTS businesses_category_location_idx ON public.businesses (category, location);
CREATE INDEX IF NOT EXISTS businesses_premium_verified_idx ON public.businesses (is_premium, verified);

CREATE INDEX IF NOT EXISTS jobs_type_level_location_idx ON public.jobs (job_type, experience_level, location);
CREATE INDEX IF NOT EXISTS jobs_remote_expires_idx ON public.jobs (remote, expires_at);

CREATE INDEX IF NOT EXISTS events_date_visibility_idx ON public.events (starts_at, visibility);
CREATE INDEX IF NOT EXISTS events_location_virtual_idx ON public.events (location, is_virtual);

-- =============================================
-- CREATE SEARCH TRIGGERS
-- =============================================

-- Businesses search trigger
CREATE TRIGGER businesses_search_trigger
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_businesses_search();

-- Jobs search trigger
CREATE TRIGGER jobs_search_trigger
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_jobs_search();

-- Events search trigger
CREATE TRIGGER events_search_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_events_search();

-- =============================================
-- POPULATE EXISTING SEARCH VECTORS
-- =============================================

-- Update existing businesses with search vectors
UPDATE public.businesses SET search = to_tsvector('simple',
  coalesce(name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(category, '') || ' ' ||
  coalesce(location, '')
) WHERE search IS NULL;

-- Update existing jobs with search vectors
UPDATE public.jobs SET search = to_tsvector('simple',
  coalesce(title, '') || ' ' ||
  coalesce(company, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(requirements, '') || ' ' ||
  coalesce(location, '')
) WHERE search IS NULL;

-- Update existing events with search vectors
UPDATE public.events SET search = to_tsvector('simple',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(location, '')
) WHERE search IS NULL;

-- =============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================

-- Mentorship profiles indexes for better matching
CREATE INDEX IF NOT EXISTS mentorship_profiles_expertise_idx ON public.mentorship_profiles USING gin (expertise_areas);
CREATE INDEX IF NOT EXISTS mentorship_profiles_industries_idx ON public.mentorship_profiles USING gin (industries);
CREATE INDEX IF NOT EXISTS mentorship_profiles_skills_idx ON public.mentorship_profiles USING gin (skills);
CREATE INDEX IF NOT EXISTS mentorship_profiles_role_available_idx ON public.mentorship_profiles (role, is_available);

-- Event attendees indexes for performance
CREATE INDEX IF NOT EXISTS event_attendees_event_status_idx ON public.event_attendees (event_id, status);
CREATE INDEX IF NOT EXISTS event_attendees_user_status_idx ON public.event_attendees (user_id, status);

-- Job applications indexes
CREATE INDEX IF NOT EXISTS job_applications_user_status_idx ON public.job_applications (user_id, status);
CREATE INDEX IF NOT EXISTS job_applications_job_status_idx ON public.job_applications (job_id, status);

-- Message performance indexes
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_members_user_left_idx ON public.conversation_members (user_id, left_at);

-- Moderation indexes for admin dashboard
CREATE INDEX IF NOT EXISTS moderation_reports_status_created_idx ON public.moderation_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_priority_status_idx ON public.moderation_reports (priority, status);
CREATE INDEX IF NOT EXISTS moderation_actions_created_idx ON public.moderation_actions (created_at DESC);

-- Business claims processing indexes
CREATE INDEX IF NOT EXISTS business_claims_status_created_idx ON public.business_claims (status, created_at DESC);

-- Yearbook claims indexes
CREATE INDEX IF NOT EXISTS yearbook_face_claims_status_user_idx ON public.yearbook_face_claims (status, user_id);
CREATE INDEX IF NOT EXISTS yearbook_name_claims_status_user_idx ON public.yearbook_name_claims (status, user_id);

-- =============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================

-- Events discovery composite index
CREATE INDEX IF NOT EXISTS events_discovery_idx ON public.events (starts_at, visibility, host_type) WHERE starts_at > now();

-- Jobs discovery composite index  
CREATE INDEX IF NOT EXISTS jobs_discovery_idx ON public.jobs (created_at DESC, visibility, expires_at) WHERE expires_at IS NULL OR expires_at > now();

-- Business directory composite index
CREATE INDEX IF NOT EXISTS businesses_directory_idx ON public.businesses (is_premium DESC, verified DESC, created_at DESC);

-- Mentorship matching composite index
CREATE INDEX IF NOT EXISTS mentorship_matching_idx ON public.mentorship_profiles (is_available, role, created_at DESC) WHERE is_available = true;

-- =============================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- =============================================

-- Update table statistics for better query planning
ANALYZE public.events;
ANALYZE public.event_tickets;
ANALYZE public.event_orders;
ANALYZE public.event_attendees;
ANALYZE public.businesses;
ANALYZE public.business_claims;
ANALYZE public.jobs;
ANALYZE public.job_applications;
ANALYZE public.job_saves;
ANALYZE public.mentorship_profiles;
ANALYZE public.mentorship_matches;
ANALYZE public.conversations;
ANALYZE public.conversation_members;
ANALYZE public.messages;
ANALYZE public.moderation_reports;
ANALYZE public.moderation_actions;