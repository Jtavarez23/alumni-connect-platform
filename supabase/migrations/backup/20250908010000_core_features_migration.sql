-- Alumni Connect Core Features Migration
-- Adds Events, Businesses, Jobs, Mentorship, and Moderation systems from AC-ARCH-002b

-- =============================================
-- 1. CREATE ENUM TYPES FOR CONSISTENT DATA
-- =============================================

-- Event roles enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_role') THEN
        CREATE TYPE event_role AS ENUM ('host', 'cohost', 'organizer', 'moderator');
    END IF;
END$$;

-- Report reasons enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
        CREATE TYPE report_reason AS ENUM ('impersonation', 'nudity', 'violence', 'harassment', 'copyright', 'spam', 'other');
    END IF;
END$$;

-- Media scan status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_scan_status') THEN
        CREATE TYPE media_scan_status AS ENUM ('pending', 'clean', 'flagged', 'quarantined', 'error');
    END IF;
END$$;

-- =============================================
-- 2. NETWORK: CONNECTIONS TABLE
-- =============================================

-- Connections table (needed for RLS policies)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

-- =============================================
-- 3. EVENTS & TICKETING SYSTEM
-- =============================================

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_type text CHECK (host_type IN ('school', 'group', 'user')) NOT NULL,
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  is_virtual boolean DEFAULT false,
  visibility text CHECK (visibility IN ('public', 'alumni_only', 'school_only', 'connections_only', 'private')) DEFAULT 'alumni_only',
  ticketing_enabled boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event tickets
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int DEFAULT 0,
  currency text DEFAULT 'USD',
  quantity int,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Event orders (Stripe integration ready)
CREATE TABLE IF NOT EXISTS public.event_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  purchaser_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.event_tickets(id) ON DELETE SET NULL,
  qty int DEFAULT 1,
  stripe_payment_intent text,
  status text CHECK (status IN ('created', 'paid', 'refunded', 'canceled')) DEFAULT 'created',
  created_at timestamptz DEFAULT now()
);

-- Event attendees
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('interested', 'going', 'declined')) DEFAULT 'interested',
  ticket_id uuid REFERENCES public.event_tickets(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- =============================================
-- 4. BUSINESSES & JOBS SYSTEM
-- =============================================

-- Businesses directory
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  website text,
  location text,
  perk text, -- alumni benefit
  is_premium boolean DEFAULT false,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Business claims (for verification)
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Job board
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  company text,
  location text,
  remote boolean DEFAULT false,
  description text,
  apply_url text,
  visibility text CHECK (visibility IN ('public', 'alumni_only', 'school_only')) DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

-- Job applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  status text DEFAULT 'applied',
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- =============================================
-- 5. MENTORSHIP SYSTEM
-- =============================================

-- Mentorship profiles
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('mentor', 'mentee', 'both')) DEFAULT 'both',
  topics text[],
  availability jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mentorship matches
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('suggested', 'accepted', 'ended')) DEFAULT 'suggested',
  created_at timestamptz DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

-- =============================================
-- 6. MODERATION & SAFETY SYSTEM
-- =============================================

-- Moderation reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table text NOT NULL, -- e.g. 'posts', 'profiles', 'yearbook_pages'
  target_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text,
  created_at timestamptz DEFAULT now(),
  status text CHECK (status IN ('open', 'reviewing', 'closed')) DEFAULT 'open'
);

-- Moderation actions
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES auth.users(id),
  action text, -- e.g., 'remove_post', 'warn_user', 'ban_user'
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Safety events log
CREATE TABLE IF NOT EXISTS public.safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text,
  entity_id uuid,
  outcome text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 7. NOTIFICATIONS SYSTEM
-- =============================================

-- User notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text, -- 'connection_request', 'comment', 'claim_approved', etc.
  payload jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add is_read column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read boolean DEFAULT false;
    END IF;
END$$;

-- =============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_host_type_host_id ON public.events(host_type, host_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);

-- Event tickets indexes
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON public.event_tickets(event_id);

-- Event orders indexes
CREATE INDEX IF NOT EXISTS idx_event_orders_event_id ON public.event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_purchaser_id ON public.event_orders(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_status ON public.event_orders(status);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);

-- Businesses indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON public.businesses(verified);

-- Business claims indexes
CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON public.business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_user_id ON public.business_claims(user_id);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON public.jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

-- Job applications indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);

-- Mentorship indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor_id ON public.mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee_id ON public.mentorship_matches(mentee_id);

-- Moderation indexes
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target_table_target_id ON public.moderation_reports(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_id ON public.moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON public.moderation_reports(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- =============================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. BASIC RLS POLICIES
-- =============================================

-- Events: View based on visibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view events based on visibility' AND tablename = 'events') THEN
    CREATE POLICY "Users can view events based on visibility" ON public.events
    FOR SELECT USING (
      visibility = 'public' OR
      (visibility = 'alumni_only' AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid()
      )) OR
      (visibility = 'school_only' AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid() AND ue.school_id = events.host_id
      )) OR
      (visibility = 'connections_only' AND EXISTS (
        SELECT 1 FROM public.connections c
        WHERE (c.user_id = auth.uid() AND c.connection_id = events.created_by AND c.status = 'accepted') OR
              (c.user_id = events.created_by AND c.connection_id = auth.uid() AND c.status = 'accepted')
      )) OR
      auth.uid() = events.created_by
    );
  END IF;
END$$;

-- Businesses: Public view, owner can manage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Businesses are publicly viewable' AND tablename = 'businesses') THEN
    CREATE POLICY "Businesses are publicly viewable" ON public.businesses
    FOR SELECT USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Business owners can manage their listings' AND tablename = 'businesses') THEN
    CREATE POLICY "Business owners can manage their listings" ON public.businesses
    FOR ALL USING (auth.uid() = owner_id);
  END IF;
END$$;

-- Jobs: View based on visibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view jobs based on visibility' AND tablename = 'jobs') THEN
    CREATE POLICY "Users can view jobs based on visibility" ON public.jobs
    FOR SELECT USING (
      visibility = 'public' OR
      (visibility = 'alumni_only' AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid()
      )) OR
      (visibility = 'school_only' AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid() AND ue.school_id IN (
          SELECT school_id FROM public.user_education WHERE user_id = jobs.posted_by
        )
      ))
    );
  END IF;
END$$;

-- Notifications: Users can only see their own
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
  END IF;
END$$;

-- Moderation: Only moderators can view reports
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only moderators can view moderation reports' AND tablename = 'moderation_reports') THEN
    CREATE POLICY "Only moderators can view moderation reports" ON public.moderation_reports
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.trust_level IN ('moderator', 'staff')
    ));
  END IF;
END$$;

-- =============================================
-- 11. EXEC_SQL FUNCTION FOR MIGRATIONS
-- =============================================

-- Function to execute SQL safely from migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- =============================================
-- 12. VERIFICATION AND VALIDATION
-- =============================================

DO $$
BEGIN
  -- Check that all required tables were created
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'connections') = 1, 'connections table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'events') = 1, 'events table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'event_tickets') = 1, 'event_tickets table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'event_orders') = 1, 'event_orders table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'businesses') = 1, 'businesses table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'jobs') = 1, 'jobs table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'mentorship_profiles') = 1, 'mentorship_profiles table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'moderation_reports') = 1, 'moderation_reports table missing';
  
  -- Check that RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'connections') = true, 'RLS not enabled on connections';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'events') = true, 'RLS not enabled on events';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'businesses') = true, 'RLS not enabled on businesses';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'moderation_reports') = true, 'RLS not enabled on moderation_reports';
  
  RAISE NOTICE 'Core features migration completed successfully';
END $$;