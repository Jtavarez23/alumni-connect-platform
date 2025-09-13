-- Alumni Connect - Comprehensive Database Schema Migration
-- This combines all three migration files for manual application

-- Create enumerations as specified in AC-ARCH-002b
DO $$ BEGIN
    CREATE TYPE trust_level AS ENUM ('unverified','verified_alumni','school_admin','moderator','staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE visibility AS ENUM ('public','alumni_only','school_only','connections_only','private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_scan_status AS ENUM ('pending','clean','flagged','quarantined','error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM ('impersonation','nudity','violence','harassment','copyright','spam','other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_role AS ENUM ('host','cohost','organizer','moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
ADD COLUMN IF NOT EXISTS storage_path text,
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
  tile_manifest text,
  image_path text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(yearbook_id, page_number)
);

-- Create page_names_ocr for OCR text extraction
CREATE TABLE IF NOT EXISTS public.page_names_ocr (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[],
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create page_faces for face detection
CREATE TABLE IF NOT EXISTS public.page_faces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[] NOT NULL,
  embedding vector(256),
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

-- Create all other required tables following the same pattern
CREATE TABLE IF NOT EXISTS public.safety_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_id uuid REFERENCES public.yearbooks(id) ON DELETE CASCADE,
  status media_scan_status DEFAULT 'pending',
  findings jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id),
  group_id uuid,
  visibility visibility DEFAULT 'alumni_only',
  text text,
  media jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_page_names_ocr_search ON public.page_names_ocr USING gin (to_tsvector('simple', text));
CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts USING gin (to_tsvector('simple', COALESCE(text,'')));
CREATE INDEX IF NOT EXISTS idx_yearbook_pages_yearbook ON public.yearbook_pages(yearbook_id, page_number);
CREATE INDEX IF NOT EXISTS idx_page_faces_page ON public.page_faces(page_id);
CREATE INDEX IF NOT EXISTS idx_page_names_ocr_page ON public.page_names_ocr(page_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims(user_id, status);

-- Enable RLS on new tables
ALTER TABLE public.school_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_names_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;