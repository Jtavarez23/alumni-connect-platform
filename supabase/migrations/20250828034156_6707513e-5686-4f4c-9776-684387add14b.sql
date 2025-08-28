-- Multi-School Database Migration - Phase 1: Database Structure Enhancement (Fixed)
-- This migration adds comprehensive multi-school support to the platform

-- 1. Create school districts table for educational system organization
CREATE TABLE public.school_districts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'United States',
  district_code text,
  superintendent text,
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create school partnerships table for cross-school collaborations
CREATE TABLE public.school_partnerships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_1_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  school_2_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  partnership_type text CHECK (partnership_type IN ('sister_school', 'rivalry', 'district_member', 'athletic_conference', 'academic_partnership')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  established_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_1_id, school_2_id, partnership_type)
);

-- 3. Enhance schools table with additional metadata
ALTER TABLE public.schools 
ADD COLUMN district_id uuid REFERENCES public.school_districts(id),
ADD COLUMN enrollment_size integer,
ADD COLUMN founding_year integer,
ADD COLUMN mascot text,
ADD COLUMN school_colors text[],
ADD COLUMN website_url text,
ADD COLUMN phone_number text,
ADD COLUMN address_line_1 text,
ADD COLUMN address_line_2 text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN zip_code text,
ADD COLUMN country text DEFAULT 'United States',
ADD COLUMN school_level text CHECK (school_level IN ('elementary', 'middle', 'high', 'college', 'university')),
ADD COLUMN is_public boolean DEFAULT true,
ADD COLUMN accreditation text[];

-- 4. Create school administrators table for school-level admin permissions
CREATE TABLE public.school_administrators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  role text CHECK (role IN ('principal', 'vice_principal', 'admin', 'teacher', 'counselor', 'moderator')),
  permissions text[] DEFAULT '{}',
  appointed_at timestamptz DEFAULT now(),
  appointed_by uuid REFERENCES public.profiles(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);

-- 5. Create school history table for users who attended multiple schools
CREATE TABLE public.school_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  start_year integer NOT NULL,
  end_year integer,
  graduated boolean DEFAULT false,
  role_type text DEFAULT 'student' CHECK (role_type IN ('student', 'teacher', 'administrator', 'staff')),
  grade_level text, -- For students: 'freshman', 'sophomore', etc.
  department text, -- For teachers/staff
  is_primary boolean DEFAULT false, -- Primary school for profile display
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  transfer_reason text,
  achievements text[],
  activities text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_year_range CHECK (end_year IS NULL OR end_year >= start_year)
);

-- 6. Create unique index to ensure only one primary school per user
CREATE UNIQUE INDEX idx_school_history_single_primary 
ON public.school_history(user_id) 
WHERE is_primary = true;

-- 7. Create school verification levels
CREATE TABLE public.school_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  verification_type text CHECK (verification_type IN ('email_domain', 'manual_review', 'peer_verification', 'document_upload')),
  verification_level text CHECK (verification_level IN ('unverified', 'basic', 'verified', 'official')),
  verified_by uuid REFERENCES public.profiles(id),
  verification_data jsonb DEFAULT '{}',
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 8. Create cross-school events table
CREATE TABLE public.cross_school_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  event_type text CHECK (event_type IN ('athletic', 'academic', 'social', 'cultural', 'fundraiser')),
  organizer_school_id uuid REFERENCES public.schools(id),
  participating_schools uuid[] DEFAULT '{}',
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  max_participants integer,
  registration_required boolean DEFAULT false,
  visibility text DEFAULT 'participating_schools' CHECK (visibility IN ('public', 'participating_schools', 'district_only')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Create school invitations system
CREATE TABLE public.school_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  to_school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  invitation_type text CHECK (invitation_type IN ('partnership', 'event_collaboration', 'yearbook_sharing', 'general_access')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  message text,
  invited_by uuid REFERENCES public.profiles(id),
  responded_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

-- Create performance indexes
CREATE INDEX idx_school_partnerships_schools ON public.school_partnerships(school_1_id, school_2_id);
CREATE INDEX idx_school_history_user ON public.school_history(user_id, school_id);
CREATE INDEX idx_school_administrators_school ON public.school_administrators(school_id, status);
CREATE INDEX idx_school_verifications_user_school ON public.school_verifications(user_id, school_id);
CREATE INDEX idx_cross_school_events_date ON public.cross_school_events(start_date, end_date);
CREATE INDEX idx_school_invitations_schools ON public.school_invitations(from_school_id, to_school_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_school_districts_updated_at
  BEFORE UPDATE ON public.school_districts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_history_updated_at
  BEFORE UPDATE ON public.school_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cross_school_events_updated_at
  BEFORE UPDATE ON public.cross_school_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE public.school_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invitations ENABLE ROW LEVEL SECURITY;