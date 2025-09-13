-- Alumni Connect - Yearbook Processing Pipeline Migration
-- Implements AC-ARCH-002a and AC-ARCH-002b specifications
-- This adds the comprehensive yearbook processing system with OCR, face detection, and claims

-- Create enumerations as specified in AC-ARCH-002b
CREATE TYPE trust_level AS ENUM ('unverified','verified_alumni','school_admin','moderator','staff');
CREATE TYPE visibility AS ENUM ('public','alumni_only','school_only','connections_only','private');
CREATE TYPE media_scan_status AS ENUM ('pending','clean','flagged','quarantined','error');
CREATE TYPE report_reason AS ENUM ('impersonation','nudity','violence','harassment','copyright','spam','other');
CREATE TYPE event_role AS ENUM ('host','cohost','organizer','moderator');

-- Update profiles table to include trust level
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trust_level trust_level DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS industry text;

-- Create school_aliases for merges/renames
CREATE TABLE IF NOT EXISTS public.school_aliases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create class_years table  
CREATE TABLE IF NOT EXISTS public.class_years (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, year)
);

-- Update yearbooks table with comprehensive processing status
ALTER TABLE public.yearbooks 
ADD COLUMN IF NOT EXISTS class_year_id uuid REFERENCES public.class_years(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status media_scan_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS page_count integer,
ADD COLUMN IF NOT EXISTS storage_path text, -- storage bucket key of original
ADD COLUMN IF NOT EXISTS ocr_done boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS face_done boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility visibility DEFAULT 'alumni_only',
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create yearbook_pages table for individual pages
CREATE TABLE IF NOT EXISTS public.yearbook_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_id uuid REFERENCES public.yearbooks(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  tile_manifest text, -- JSON path to tiles/IIIF manifest
  image_path text, -- storage key of full-res image
  created_at timestamptz DEFAULT now(),
  UNIQUE(yearbook_id, page_number)
);

-- Create page_names_ocr for OCR text extraction
CREATE TABLE IF NOT EXISTS public.page_names_ocr (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[], -- optional bounding boxes [x,y,w,h]
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for full-text search on OCR text
CREATE INDEX IF NOT EXISTS idx_page_names_ocr_search ON public.page_names_ocr USING gin (to_tsvector('simple', text));

-- Create page_faces for face detection
CREATE TABLE IF NOT EXISTS public.page_faces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[] NOT NULL, -- bounding box [x,y,w,h]
  embedding vector(256), -- optional if using pgvector later
  claimed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create claims table for photo/name claims
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  page_face_id uuid REFERENCES public.page_faces(id) ON DELETE SET NULL,
  page_name_id uuid REFERENCES public.page_names_ocr(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create safety_queue for media scanning
CREATE TABLE IF NOT EXISTS public.safety_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_id uuid REFERENCES public.yearbooks(id) ON DELETE CASCADE,
  status media_scan_status DEFAULT 'pending',
  findings jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create posts table for social features
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id), -- optional scope
  group_id uuid REFERENCES public.groups(id), -- optional
  visibility visibility DEFAULT 'alumni_only',
  text text,
  media jsonb, -- array of storage keys/metadata
  metrics jsonb DEFAULT '{}'::jsonb, -- like_count, comment_count, share_count
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add search index for posts
CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts USING gin (to_tsvector('simple', COALESCE(text,'')));

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create connections table (if not exists)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending','accepted','rejected','blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id), -- null for global
  name text NOT NULL,
  kind text CHECK (kind IN ('class','club','team','custom')) DEFAULT 'custom',
  visibility visibility DEFAULT 'alumni_only',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create group_members table  
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  host_type text CHECK (host_type IN ('school','group','user')) NOT NULL,
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  is_virtual boolean DEFAULT false,
  visibility visibility DEFAULT 'alumni_only',
  ticketing_enabled boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create event_tickets table
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents integer DEFAULT 0,
  currency text DEFAULT 'USD',
  quantity integer,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create event_orders table
CREATE TABLE IF NOT EXISTS public.event_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  purchaser_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.event_tickets(id) ON DELETE SET NULL,
  qty integer DEFAULT 1,
  stripe_payment_intent text,
  status text CHECK (status IN ('created','paid','refunded','canceled')) DEFAULT 'created',
  created_at timestamptz DEFAULT now()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  website text,
  location text,
  perk text, -- alumni benefit
  is_premium boolean DEFAULT false,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create business_claims table
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  company text,
  location text,
  remote boolean DEFAULT false,
  description text,
  apply_url text,
  visibility visibility DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  status text DEFAULT 'applied',
  created_at timestamptz DEFAULT now()
);

-- Create mentorship_profiles table
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('mentor','mentee','both')) DEFAULT 'both',
  topics text[],
  availability jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create mentorship_matches table
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('suggested','accepted','ended')) DEFAULT 'suggested',
  created_at timestamptz DEFAULT now()
);

-- Create conversations table (if not exists - check for messages table)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_group boolean DEFAULT false,
  title text,
  created_at timestamptz DEFAULT now()
);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Update messages table to link to conversations (if it doesn't already)
-- Note: We'll check existing messages table structure first

-- Create moderation_reports table
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table text NOT NULL, -- e.g. 'posts','profiles','yearbook_pages'
  target_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text,
  created_at timestamptz DEFAULT now(),
  status text CHECK (status IN ('open','reviewing','closed')) DEFAULT 'open'
);

-- Create moderation_actions table
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES auth.users(id),
  action text, -- e.g., 'remove_post','warn_user','ban_user'
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create safety_events table
CREATE TABLE IF NOT EXISTS public.safety_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity text,
  entity_id uuid,
  outcome text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text, -- 'connection_request','comment','claim_approved', etc.
  payload jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_yearbook_pages_yearbook ON public.yearbook_pages(yearbook_id, page_number);
CREATE INDEX IF NOT EXISTS idx_page_faces_page ON public.page_faces(page_id);
CREATE INDEX IF NOT EXISTS idx_page_names_ocr_page ON public.page_names_ocr(page_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_face ON public.claims(page_face_id);
CREATE INDEX IF NOT EXISTS idx_claims_name ON public.claims(page_name_id);
CREATE INDEX IF NOT EXISTS idx_safety_queue_status ON public.safety_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_author_date ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_school_date ON public.posts(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_connections_user_status ON public.connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Enable RLS on all new tables
ALTER TABLE public.school_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_names_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;