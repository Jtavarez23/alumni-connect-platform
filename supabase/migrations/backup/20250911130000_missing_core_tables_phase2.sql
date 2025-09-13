-- Alumni Connect Sprint 1 - Missing Core Tables Phase 2
-- Implements mentorship system and enhanced events functionality
-- Priority: Mentorship Platform, Enhanced Events, Group Management

-- =============================================
-- ADDITIONAL ENUMS AND TYPES
-- =============================================

-- Mentorship related enums
DO $$ BEGIN
    CREATE TYPE mentorship_role AS ENUM ('mentor','mentee','both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('suggested','requested','accepted','declined','ended','paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM ('available','busy','unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Event related enums
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft','published','cancelled','postponed','completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('registered','going','maybe','not_going','checked_in');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- MENTORSHIP PLATFORM SYSTEM
-- =============================================

-- Mentorship profiles for users who want to mentor or be mentored
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role mentorship_role NOT NULL DEFAULT 'both',
  bio text,
  expertise_areas text[] DEFAULT '{}', -- Array of skill/industry areas
  interests text[] DEFAULT '{}', -- Areas they want to learn about
  industry text,
  job_title text,
  company text,
  years_of_experience integer,
  education_level text CHECK (education_level IN ('high_school','associates','bachelors','masters','doctorate','other')),
  preferred_mentee_level text CHECK (preferred_mentee_level IN ('student','entry','mid','senior')) DEFAULT 'student',
  availability_status availability_status DEFAULT 'available',
  max_mentees integer DEFAULT 3, -- For mentors
  meeting_preference text CHECK (meeting_preference IN ('video','phone','text','in_person','any')) DEFAULT 'video',
  languages_spoken text[] DEFAULT '{"English"}',
  timezone text DEFAULT 'UTC',
  hourly_rate_cents integer, -- For paid mentorship (future feature)
  is_verified boolean DEFAULT false, -- Verified mentor status
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  profile_views integer DEFAULT 0,
  successful_matches integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_experience CHECK (years_of_experience >= 0),
  CONSTRAINT valid_max_mentees CHECK (max_mentees >= 0 AND max_mentees <= 20),
  CONSTRAINT valid_rating CHECK (average_rating >= 0.0 AND average_rating <= 5.0)
);

-- Availability schedule for mentors
CREATE TABLE IF NOT EXISTS public.mentorship_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_profile_id uuid REFERENCES public.mentorship_profiles(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_recurring boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Mentorship matches/relationships
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status match_status DEFAULT 'suggested',
  match_score numeric(4,3), -- Algorithm-generated compatibility score
  matched_by text CHECK (matched_by IN ('system','mutual','mentor','mentee')) DEFAULT 'system',
  goals text, -- What the mentee wants to achieve
  mentor_notes text, -- Private notes for mentor
  mentee_notes text, -- Private notes for mentee
  session_frequency text CHECK (session_frequency IN ('weekly','biweekly','monthly','as_needed')) DEFAULT 'monthly',
  total_sessions integer DEFAULT 0,
  last_session_at timestamptz,
  next_session_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_mentorship CHECK (mentor_id != mentee_id),
  UNIQUE(mentor_id, mentee_id)
);

-- Individual mentorship sessions tracking
CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.mentorship_matches(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  meeting_link text,
  meeting_location text,
  session_notes text, -- Joint notes
  mentor_feedback text, -- Private mentor notes
  mentee_feedback text, -- Private mentee notes
  mentor_rating integer CHECK (mentor_rating >= 1 AND mentor_rating <= 5),
  mentee_rating integer CHECK (mentee_rating >= 1 AND mentee_rating <= 5),
  status text CHECK (status IN ('scheduled','completed','cancelled','no_show')) DEFAULT 'scheduled',
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mentorship program goals and progress tracking
CREATE TABLE IF NOT EXISTS public.mentorship_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.mentorship_matches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  status text CHECK (status IN ('not_started','in_progress','completed','on_hold')) DEFAULT 'not_started',
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for mentorship tables
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_role ON public.mentorship_profiles(role, is_active, availability_status);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_expertise ON public.mentorship_profiles USING gin (expertise_areas);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_industry ON public.mentorship_profiles(industry, years_of_experience);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor ON public.mentorship_matches(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee ON public.mentorship_matches(mentee_id, status);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_scheduled ON public.mentorship_sessions(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_mentorship_goals_match ON public.mentorship_goals(match_id, status);

-- =============================================
-- ENHANCED EVENTS SYSTEM
-- =============================================

-- Event attendees with enhanced tracking
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status attendance_status DEFAULT 'registered',
  registered_at timestamptz DEFAULT now(),
  check_in_time timestamptz,
  check_out_time timestamptz,
  ticket_id uuid REFERENCES public.event_tickets(id) ON DELETE SET NULL,
  guest_count integer DEFAULT 0 CHECK (guest_count >= 0),
  special_requirements text,
  dietary_restrictions text,
  emergency_contact jsonb, -- {name, phone, relationship}
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Event organizers and roles
CREATE TABLE IF NOT EXISTS public.event_organizers (
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role event_role DEFAULT 'organizer',
  responsibilities text[],
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Event agenda/schedule
CREATE TABLE IF NOT EXISTS public.event_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  speaker_name text,
  speaker_bio text,
  location text, -- Specific location within event venue
  session_type text CHECK (session_type IN ('keynote','workshop','panel','networking','break','meal')),
  is_mandatory boolean DEFAULT false,
  max_capacity integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_agenda_time CHECK (end_time IS NULL OR end_time > start_time)
);

-- Event feedback and ratings
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  venue_rating integer CHECK (venue_rating >= 1 AND venue_rating <= 5),
  content_rating integer CHECK (content_rating >= 1 AND content_rating <= 5),
  networking_rating integer CHECK (networking_rating >= 1 AND networking_rating <= 5),
  feedback_text text,
  would_recommend boolean,
  improvement_suggestions text,
  favorite_session_id uuid REFERENCES public.event_agenda(id) ON DELETE SET NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(event_id, attendee_id)
);

-- Event announcements/updates
CREATE TABLE IF NOT EXISTS public.event_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_important boolean DEFAULT false,
  send_notification boolean DEFAULT true,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for enhanced events
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_organizers_user ON public.event_organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_agenda_event ON public.event_agenda(event_id, start_time);
CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON public.event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_announcements_event ON public.event_announcements(event_id, created_at DESC);

-- =============================================
-- ENHANCED GROUP MANAGEMENT
-- =============================================

-- Group posts (separate from general posts for better organization)
CREATE TABLE IF NOT EXISTS public.group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  is_announcement boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group events (linking groups to events)
CREATE TABLE IF NOT EXISTS public.group_events (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, event_id)
);

-- Group invitations
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text CHECK (status IN ('pending','accepted','declined','expired')) DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, invitee_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Group settings and configuration
CREATE TABLE IF NOT EXISTS public.group_settings (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  require_approval boolean DEFAULT false,
  allow_member_posts boolean DEFAULT true,
  allow_member_invites boolean DEFAULT true,
  auto_approve_alumni boolean DEFAULT false, -- Auto-approve same school alumni
  welcome_message text,
  rules text,
  tags text[] DEFAULT '{}', -- For categorization
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for group enhancements
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON public.group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_author ON public.group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON public.group_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON public.group_invitations(group_id, status);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Mentorship tables
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_goals ENABLE ROW LEVEL SECURITY;

-- Enhanced events tables
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

-- Group enhancement tables
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES
-- =============================================

-- Mentorship profiles: Public read for discovery, owner write
CREATE POLICY "mentorship_profiles_public_read" ON public.mentorship_profiles
FOR SELECT USING (is_active = true);

CREATE POLICY "mentorship_profiles_owner_write" ON public.mentorship_profiles
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mentorship matches: Participants only
CREATE POLICY "mentorship_matches_participants" ON public.mentorship_matches
FOR ALL USING (auth.uid() IN (mentor_id, mentee_id)) 
WITH CHECK (auth.uid() IN (mentor_id, mentee_id));

-- Mentorship sessions: Participants only
CREATE POLICY "mentorship_sessions_participants" ON public.mentorship_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches m 
    WHERE m.id = match_id AND auth.uid() IN (m.mentor_id, m.mentee_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches m 
    WHERE m.id = match_id AND auth.uid() IN (m.mentor_id, m.mentee_id)
  )
);

-- Event attendees: Attendee and event organizers
CREATE POLICY "event_attendees_access" ON public.event_attendees
FOR ALL USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id AND e.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.event_organizers eo 
    WHERE eo.event_id = event_id AND eo.user_id = auth.uid()
  )
);

-- Group posts: Group members
CREATE POLICY "group_posts_members" ON public.group_posts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_posts.group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_posts_author" ON public.group_posts
FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to calculate mentorship compatibility score
CREATE OR REPLACE FUNCTION public.calculate_mentorship_compatibility(
  mentor_profile_id uuid,
  mentee_profile_id uuid
)
RETURNS numeric(4,3)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  compatibility_score numeric(4,3) := 0.0;
  expertise_overlap integer;
  interest_overlap integer;
BEGIN
  -- Calculate overlap between mentor expertise and mentee interests
  SELECT COUNT(*)
  INTO expertise_overlap
  FROM (
    SELECT UNNEST(mp1.expertise_areas) as skill
    FROM public.mentorship_profiles mp1 
    WHERE mp1.id = mentor_profile_id
    INTERSECT
    SELECT UNNEST(mp2.interests) as skill
    FROM public.mentorship_profiles mp2 
    WHERE mp2.id = mentee_profile_id
  ) overlaps;
  
  -- Base score from skill overlap (40% weight)
  compatibility_score := compatibility_score + (expertise_overlap * 0.4);
  
  -- Industry match (30% weight)
  IF EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp1, public.mentorship_profiles mp2
    WHERE mp1.id = mentor_profile_id 
    AND mp2.id = mentee_profile_id
    AND mp1.industry = mp2.industry
  ) THEN
    compatibility_score := compatibility_score + 0.3;
  END IF;
  
  -- Meeting preference compatibility (20% weight)
  IF EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp1, public.mentorship_profiles mp2
    WHERE mp1.id = mentor_profile_id 
    AND mp2.id = mentee_profile_id
    AND (mp1.meeting_preference = mp2.meeting_preference OR 
         mp1.meeting_preference = 'any' OR mp2.meeting_preference = 'any')
  ) THEN
    compatibility_score := compatibility_score + 0.2;
  END IF;
  
  -- Timezone compatibility (10% weight)
  IF EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp1, public.mentorship_profiles mp2
    WHERE mp1.id = mentor_profile_id 
    AND mp2.id = mentee_profile_id
    AND mp1.timezone = mp2.timezone
  ) THEN
    compatibility_score := compatibility_score + 0.1;
  END IF;
  
  -- Normalize to 0-1 scale
  RETURN LEAST(compatibility_score, 1.0);
END;
$$;

-- Function to update group member statistics
CREATE OR REPLACE FUNCTION public.update_group_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update member count when someone joins
    UPDATE public.groups 
    SET member_count = COALESCE(member_count, 0) + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update member count when someone leaves
    UPDATE public.groups 
    SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add triggers for automatic group stats updates
CREATE TRIGGER update_group_member_count
  AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.update_group_stats();

-- Update timestamps triggers
CREATE TRIGGER update_mentorship_profiles_updated_at
  BEFORE UPDATE ON public.mentorship_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mentorship_matches_updated_at
  BEFORE UPDATE ON public.mentorship_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mentorship_sessions_updated_at
  BEFORE UPDATE ON public.mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_group_posts_updated_at
  BEFORE UPDATE ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- MIGRATION VALIDATION
-- =============================================

-- Verify all tables were created
DO $$
DECLARE
  missing_tables text[] := ARRAY[
    'mentorship_profiles', 'mentorship_availability', 'mentorship_matches', 
    'mentorship_sessions', 'mentorship_goals',
    'event_attendees', 'event_organizers', 'event_agenda', 'event_feedback', 'event_announcements',
    'group_posts', 'group_events', 'group_invitations', 'group_settings'
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
  
  RAISE NOTICE 'Phase 2 Migration completed successfully: All % tables created', array_length(missing_tables, 1);
END $$;