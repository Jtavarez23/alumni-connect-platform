-- Alumni Connect Sprint 1 - Missing Core Tables Phase 1
-- Implements critical missing tables from AC-ARCH-002b specification
-- Priority: Moderation, Business Directory, Jobs, Notifications

-- =============================================
-- ENUMS AND TYPES (if not exists)
-- =============================================

-- Extend existing enums or create missing ones
DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM ('impersonation','nudity','violence','harassment','copyright','spam','other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('applied','reviewed','interview','rejected','accepted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('connection_request','comment','reaction','claim_approved','claim_rejected','event_invite','message','mention','system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- MODERATION & SAFETY SYSTEM
-- =============================================

-- Moderation reports table
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table text NOT NULL, -- 'posts','profiles','yearbooks','events','businesses',etc.
  target_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text,
  status text CHECK (status IN ('open','reviewing','resolved','dismissed')) DEFAULT 'open',
  priority text CHECK (priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  assigned_moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL, -- 'remove_content','warn_user','suspend_user','ban_user','dismiss_report'
  action_details jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Safety events for audit trail
CREATE TABLE IF NOT EXISTS public.safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'yearbook','post','profile','message'
  entity_id uuid NOT NULL,
  event_type text NOT NULL, -- 'flagged','quarantined','approved','rejected'
  severity text CHECK (severity IN ('info','warning','critical')) DEFAULT 'info',
  automated boolean DEFAULT false, -- true if automated system, false if human moderator
  details jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for moderation tables
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON public.moderation_reports(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON public.moderation_reports(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON public.moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON public.moderation_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_entity ON public.safety_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_created ON public.safety_events(created_at DESC);

-- =============================================
-- BUSINESS DIRECTORY SYSTEM
-- =============================================

-- Main businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  subcategory text,
  description text,
  website text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  postal_code text,
  coordinates point, -- PostGIS point for location
  logo_url text,
  cover_image_url text,
  alumni_perk text, -- Special offer for alumni
  perk_description text,
  hours_of_operation jsonb DEFAULT '{}'::jsonb,
  social_media jsonb DEFAULT '{}'::jsonb, -- {facebook, instagram, linkedin, etc}
  is_verified boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  listing_expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Business ownership claims
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type text CHECK (claim_type IN ('owner','manager','employee')) DEFAULT 'owner',
  evidence_urls text[], -- Supporting documentation
  notes text,
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, user_id) -- One claim per user per business
);

-- Business reviews (for future implementation)
CREATE TABLE IF NOT EXISTS public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_verified_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, reviewer_id) -- One review per user per business
);

-- Indexes for business tables
CREATE INDEX IF NOT EXISTS idx_businesses_location ON public.businesses(city, state, country);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_businesses_featured ON public.businesses(is_featured, is_verified) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_businesses_search ON public.businesses USING gin (to_tsvector('simple', 
  coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'')));
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON public.business_claims(status, created_at);
CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON public.business_reviews(business_id, created_at DESC);

-- =============================================
-- JOBS & CAREER SYSTEM
-- =============================================

-- Jobs postings table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company text NOT NULL,
  company_logo_url text,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  benefits text,
  salary_min integer, -- in cents to avoid floating point issues
  salary_max integer,
  salary_currency text DEFAULT 'USD',
  salary_period text CHECK (salary_period IN ('hour','month','year')) DEFAULT 'year',
  employment_type text CHECK (employment_type IN ('full_time','part_time','contract','internship','freelance')) DEFAULT 'full_time',
  experience_level text CHECK (experience_level IN ('entry','mid','senior','executive')) DEFAULT 'mid',
  location text,
  is_remote boolean DEFAULT false,
  remote_policy text CHECK (remote_policy IN ('on_site','hybrid','remote')) DEFAULT 'on_site',
  apply_url text,
  application_email text,
  application_instructions text,
  visibility visibility DEFAULT 'public',
  is_featured boolean DEFAULT false,
  expires_at timestamptz,
  view_count integer DEFAULT 0,
  application_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min),
  CONSTRAINT has_application_method CHECK (apply_url IS NOT NULL OR application_email IS NOT NULL)
);

-- Job applications tracking
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_url text,
  cover_letter text,
  additional_notes text,
  status application_status DEFAULT 'applied',
  applied_at timestamptz DEFAULT now(),
  status_updated_at timestamptz DEFAULT now(),
  status_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recruiter_notes text,
  interview_scheduled_at timestamptz,
  UNIQUE(job_id, applicant_id) -- One application per user per job
);

-- Job saved/bookmarked by users
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- Indexes for job tables
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location, is_remote);
CREATE INDEX IF NOT EXISTS idx_jobs_employment ON public.jobs(employment_type, experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON public.jobs(created_at DESC) WHERE expires_at IS NULL OR expires_at > now();
CREATE INDEX IF NOT EXISTS idx_jobs_search ON public.jobs USING gin (to_tsvector('simple',
  coalesce(title,'') || ' ' || coalesce(company,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON public.job_applications(applicant_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_id, status);

-- =============================================
-- NOTIFICATIONS SYSTEM
-- =============================================

-- User notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text,
  action_url text, -- Deep link to relevant content
  entity_type text, -- 'post','event','connection','claim'
  entity_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Who triggered the notification
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional context data
  is_read boolean DEFAULT false,
  is_email_sent boolean DEFAULT false,
  is_push_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  connection_requests_email boolean DEFAULT true,
  connection_requests_push boolean DEFAULT true,
  comments_email boolean DEFAULT true,
  comments_push boolean DEFAULT false,
  reactions_email boolean DEFAULT false,
  reactions_push boolean DEFAULT false,
  claims_email boolean DEFAULT true,
  claims_push boolean DEFAULT true,
  events_email boolean DEFAULT true,
  events_push boolean DEFAULT true,
  messages_email boolean DEFAULT true,
  messages_push boolean DEFAULT true,
  marketing_email boolean DEFAULT false,
  digest_frequency text CHECK (digest_frequency IN ('never','daily','weekly','monthly')) DEFAULT 'weekly',
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for notification tables
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES (Detailed policies in next migration)
-- =============================================

-- Moderation: Only moderators and staff can access
CREATE POLICY "moderation_reports_moderator_access" ON public.moderation_reports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND trust IN ('moderator', 'staff')
  )
);

CREATE POLICY "moderation_actions_moderator_access" ON public.moderation_actions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND trust IN ('moderator', 'staff')
  )
);

CREATE POLICY "safety_events_staff_access" ON public.safety_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND trust IN ('staff')
  )
);

-- Businesses: Public read, owner/admin write
CREATE POLICY "businesses_public_read" ON public.businesses
FOR SELECT USING (true);

CREATE POLICY "businesses_owner_write" ON public.businesses
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "businesses_owner_update" ON public.businesses
FOR UPDATE USING (auth.uid() = created_by);

-- Business claims: User can claim, owner/moderator can approve
CREATE POLICY "business_claims_user_create" ON public.business_claims
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "business_claims_visibility" ON public.business_claims
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_id AND b.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND trust IN ('moderator', 'staff')
  )
);

-- Jobs: Public read, poster write
CREATE POLICY "jobs_public_read" ON public.jobs
FOR SELECT USING (visibility = 'public' OR auth.uid() = posted_by);

CREATE POLICY "jobs_poster_write" ON public.jobs
FOR ALL USING (auth.uid() = posted_by) 
WITH CHECK (auth.uid() = posted_by);

-- Job applications: Applicant and job poster can see
CREATE POLICY "job_applications_access" ON public.job_applications
FOR ALL USING (
  auth.uid() = applicant_id OR 
  EXISTS (
    SELECT 1 FROM public.jobs j 
    WHERE j.id = job_id AND j.posted_by = auth.uid()
  )
);

-- Notifications: User can only see their own
CREATE POLICY "notifications_self_access" ON public.notifications
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_self_access" ON public.notification_preferences
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to update notification read status
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  recipient_id uuid,
  notification_type notification_type,
  title text,
  message text DEFAULT NULL,
  action_url text DEFAULT NULL,
  entity_type text DEFAULT NULL,
  entity_id uuid DEFAULT NULL,
  actor_id uuid DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, action_url, 
    entity_type, entity_id, actor_id, metadata
  ) VALUES (
    recipient_id, notification_type, title, message, action_url,
    entity_type, entity_id, COALESCE(actor_id, auth.uid()), metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Update timestamps function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_moderation_reports_updated_at
  BEFORE UPDATE ON public.moderation_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- MIGRATION VALIDATION
-- =============================================

-- Verify all tables were created
DO $$
DECLARE
  missing_tables text[] := ARRAY[
    'moderation_reports', 'moderation_actions', 'safety_events',
    'businesses', 'business_claims', 'business_reviews',
    'jobs', 'job_applications', 'saved_jobs',
    'notifications', 'notification_preferences'
  ];
  table_name text;
  table_exists boolean;
BEGIN
  FOREACH table_name IN ARRAY missing_tables LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = missing_tables.table_name
    ) INTO table_exists;
    
    IF NOT table_exists THEN
      RAISE EXCEPTION 'Migration failed: Table % was not created', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully: All % tables created', array_length(missing_tables, 1);
END $$;