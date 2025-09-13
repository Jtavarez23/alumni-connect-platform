-- Priority 2 Feature Tables Migration
-- Events, Businesses, Jobs, Mentorship, Messaging, Moderation
-- Based on AC-ARCH-002b specifications

-- =============================================
-- ENUMS AND TYPES
-- =============================================

-- Add new enums for Priority 2 features
CREATE TYPE IF NOT EXISTS event_role AS ENUM ('host', 'cohost', 'organizer', 'moderator');
CREATE TYPE IF NOT EXISTS order_status AS ENUM ('created', 'paid', 'refunded', 'canceled');
CREATE TYPE IF NOT EXISTS claim_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE IF NOT EXISTS mentorship_role AS ENUM ('mentor', 'mentee', 'both');
CREATE TYPE IF NOT EXISTS match_status AS ENUM ('suggested', 'accepted', 'ended');

-- =============================================
-- EVENTS & TICKETING SYSTEM
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
  visibility visibility DEFAULT 'alumni_only',
  ticketing_enabled boolean DEFAULT false,
  max_capacity int,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.events (starts_at);
CREATE INDEX ON public.events (host_type, host_id);
CREATE INDEX ON public.events (created_by);
CREATE INDEX ON public.events USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Event tickets
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int DEFAULT 0,
  currency text DEFAULT 'USD',
  quantity int,
  quantity_sold int DEFAULT 0,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.event_tickets (event_id);

-- Event orders (ticket purchases)
CREATE TABLE IF NOT EXISTS public.event_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  purchaser_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.event_tickets(id) ON DELETE SET NULL,
  qty int DEFAULT 1,
  total_cents int NOT NULL,
  currency text DEFAULT 'USD',
  stripe_payment_intent text,
  status order_status DEFAULT 'created',
  attendee_emails text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.event_orders (purchaser_id);
CREATE INDEX ON public.event_orders (event_id);
CREATE INDEX ON public.event_orders (status);

-- Event attendees (for RSVPs and attendance tracking)
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.event_orders(id) ON DELETE SET NULL,
  status text CHECK (status IN ('registered', 'attended', 'no_show')) DEFAULT 'registered',
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX ON public.event_attendees (event_id);
CREATE INDEX ON public.event_attendees (user_id);

-- =============================================
-- BUSINESS DIRECTORY SYSTEM
-- =============================================

-- Businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text,
  website text,
  email text,
  phone text,
  location text,
  address jsonb, -- {street, city, state, zip, country}
  perk text, -- alumni benefit description
  perk_url text, -- link to redeem alumni perk
  is_premium boolean DEFAULT false,
  verified boolean DEFAULT false,
  logo_url text,
  images text[], -- array of image URLs
  hours jsonb, -- business hours
  social_links jsonb, -- {facebook, instagram, linkedin, etc}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.businesses (category);
CREATE INDEX ON public.businesses (location);
CREATE INDEX ON public.businesses (is_premium);
CREATE INDEX ON public.businesses (verified);
CREATE INDEX ON public.businesses USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')));

-- Business claims (for ownership verification)
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status claim_status DEFAULT 'pending',
  evidence_type text, -- 'website', 'email', 'document', 'social'
  evidence_data jsonb, -- verification evidence
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX ON public.business_claims (status);
CREATE INDEX ON public.business_claims (user_id);

-- =============================================
-- JOBS & CAREER SYSTEM
-- =============================================

-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL, -- link to business if applicable
  title text NOT NULL,
  company text NOT NULL,
  location text,
  remote boolean DEFAULT false,
  job_type text CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'volunteer')),
  experience_level text CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
  salary_min int,
  salary_max int,
  salary_currency text DEFAULT 'USD',
  description text NOT NULL,
  requirements text,
  benefits text,
  apply_url text,
  apply_email text,
  visibility visibility DEFAULT 'public',
  is_featured boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.jobs (posted_by);
CREATE INDEX ON public.jobs (company_id);
CREATE INDEX ON public.jobs (location);
CREATE INDEX ON public.jobs (remote);
CREATE INDEX ON public.jobs (job_type);
CREATE INDEX ON public.jobs (experience_level);
CREATE INDEX ON public.jobs (expires_at);
CREATE INDEX ON public.jobs USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, '')));

-- Job applications tracking
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  status text CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn')) DEFAULT 'applied',
  notes text, -- internal notes
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

CREATE INDEX ON public.job_applications (job_id);
CREATE INDEX ON public.job_applications (user_id);
CREATE INDEX ON public.job_applications (status);

-- Job saves/bookmarks
CREATE TABLE IF NOT EXISTS public.job_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

CREATE INDEX ON public.job_saves (user_id);

-- =============================================
-- MENTORSHIP SYSTEM
-- =============================================

-- Mentorship profiles
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role mentorship_role DEFAULT 'both',
  bio text,
  expertise_areas text[], -- array of skill/industry areas
  career_stage text,
  current_role text,
  current_company text,
  industries text[],
  skills text[],
  languages text[],
  availability jsonb, -- {timezone, preferred_days, preferred_times}
  meeting_preferences text[], -- ['video', 'phone', 'in-person', 'chat']
  max_mentees int DEFAULT 3, -- for mentors
  is_available boolean DEFAULT true,
  linkedin_url text,
  portfolio_url text,
  hourly_rate_cents int, -- optional for paid mentorship
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.mentorship_profiles (role);
CREATE INDEX ON public.mentorship_profiles (is_available);
CREATE INDEX ON public.mentorship_profiles USING gin (expertise_areas);
CREATE INDEX ON public.mentorship_profiles USING gin (industries);
CREATE INDEX ON public.mentorship_profiles USING gin (skills);

-- Mentorship matches/connections
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status match_status DEFAULT 'suggested',
  match_score int, -- algorithm confidence score
  matched_on jsonb, -- what criteria they matched on
  message text, -- initial connection message
  accepted_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

CREATE INDEX ON public.mentorship_matches (mentor_id);
CREATE INDEX ON public.mentorship_matches (mentee_id);
CREATE INDEX ON public.mentorship_matches (status);

-- =============================================
-- ENHANCED MESSAGING SYSTEM
-- =============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_group boolean DEFAULT false,
  title text,
  description text,
  avatar_url text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.conversations (last_message_at);
CREATE INDEX ON public.conversations (created_by);

-- Conversation members
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz DEFAULT now(),
  notification_preferences jsonb DEFAULT '{"muted": false}'::jsonb,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX ON public.conversation_members (conversation_id);
CREATE INDEX ON public.conversation_members (user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  message_type text CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
  text text,
  media jsonb, -- {type, url, filename, size, thumbnail}
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.messages (conversation_id, created_at);
CREATE INDEX ON public.messages (sender_id);
CREATE INDEX ON public.messages (reply_to_id);
CREATE INDEX ON public.messages USING gin (to_tsvector('simple', coalesce(text, '')));

-- =============================================
-- MODERATION & SAFETY SYSTEM
-- =============================================

-- Moderation reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table text NOT NULL, -- 'posts', 'profiles', 'yearbook_pages', 'events', 'businesses', 'jobs', 'messages'
  target_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text,
  screenshots text[], -- evidence URLs
  status text CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'open',
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.moderation_reports (target_table, target_id);
CREATE INDEX ON public.moderation_reports (reporter_id);
CREATE INDEX ON public.moderation_reports (status);
CREATE INDEX ON public.moderation_reports (priority);
CREATE INDEX ON public.moderation_reports (assigned_to);

-- Moderation actions
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'dismiss', 'warn_user', 'remove_content', 'suspend_user', 'ban_user', 'delete_account'
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  duration_hours int, -- for temporary actions
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.moderation_actions (report_id);
CREATE INDEX ON public.moderation_actions (moderator_id);
CREATE INDEX ON public.moderation_actions (target_user_id);

-- =============================================
-- ENHANCED YEARBOOK SYSTEM
-- =============================================

-- Face claims for yearbook photos
CREATE TABLE IF NOT EXISTS public.yearbook_face_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_face_id uuid REFERENCES public.page_faces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status claim_status DEFAULT 'pending',
  confidence_score decimal(3,2), -- AI confidence 0.00-1.00
  verification_method text CHECK (verification_method IN ('auto', 'manual', 'peer_verified')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_face_id, user_id)
);

CREATE INDEX ON public.yearbook_face_claims (user_id);
CREATE INDEX ON public.yearbook_face_claims (status);

-- Name claims for yearbook OCR text
CREATE TABLE IF NOT EXISTS public.yearbook_name_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name_id uuid REFERENCES public.page_names_ocr(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status claim_status DEFAULT 'pending',
  confidence_score decimal(3,2),
  verification_method text CHECK (verification_method IN ('auto', 'manual', 'peer_verified')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_name_id, user_id)
);

CREATE INDEX ON public.yearbook_name_claims (user_id);
CREATE INDEX ON public.yearbook_name_claims (status);

-- =============================================
-- TRIGGER FUNCTIONS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for relevant tables
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_event_orders_updated_at BEFORE UPDATE ON public.event_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mentorship_profiles_updated_at BEFORE UPDATE ON public.mentorship_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mentorship_matches_updated_at BEFORE UPDATE ON public.mentorship_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_moderation_reports_updated_at BEFORE UPDATE ON public.moderation_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update last_message_at when new messages are added
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message_trigger 
  AFTER INSERT ON public.messages 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_conversation_last_message();

-- =============================================
-- ENABLE RLS (Row Level Security will be configured in next migration)
-- =============================================

-- Enable RLS on all tables (policies will be added separately)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_face_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_name_claims ENABLE ROW LEVEL SECURITY;