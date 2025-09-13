-- Alumni Connect Schema Alignment Migration
-- Aligns database schema with AC-ARCH-002a specifications
-- Fixes table names, adds missing tables, and implements proper RLS

-- =============================================
-- 1. RENAME EXISTING TABLES TO MATCH SPECIFICATIONS
-- =============================================

-- Rename yearbook_editions to yearbooks (AC-ARCH-002a specification)
ALTER TABLE IF EXISTS public.yearbook_editions RENAME TO yearbooks;

-- Rename yearbook_entries to yearbook_pages (AC-ARCH-002a specification)  
ALTER TABLE IF EXISTS public.yearbook_entries RENAME TO yearbook_pages;

-- Update foreign key references after renaming
ALTER TABLE IF EXISTS public.yearbook_pages 
RENAME COLUMN edition_id TO yearbook_id;

-- =============================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================

-- Add status column to yearbooks table (AC-ARCH-002a)
ALTER TABLE public.yearbooks 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('processing', 'ready', 'flagged')) DEFAULT 'processing',
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add ocr_text column to yearbook_pages table (AC-ARCH-002a)
ALTER TABLE public.yearbook_pages 
ADD COLUMN IF NOT EXISTS ocr_text tsvector,
ADD COLUMN IF NOT EXISTS processed_at timestamptz,
ADD COLUMN IF NOT EXISTS image_url text;

-- =============================================
-- 3. CREATE MISSING TABLES FROM AC-ARCH-002a
-- =============================================

-- yearbook_faces table (AC-ARCH-002a specification)
CREATE TABLE IF NOT EXISTS public.yearbook_faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox jsonb NOT NULL, -- {x: number, y: number, width: number, height: number}
  detected_name text,
  claimed_by uuid REFERENCES auth.users(id),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- yearbook_claims table (AC-ARCH-002a specification)
CREATE TABLE IF NOT EXISTS public.yearbook_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id uuid REFERENCES public.yearbook_faces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(face_id, user_id)
);

-- groups table (AC-ARCH-002a specification)
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text CHECK (type IN ('class', 'club', 'custom')) NOT NULL,
  school_id uuid REFERENCES public.schools(id),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  privacy text CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

-- group_members table (AC-ARCH-002a specification)
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('member', 'admin', 'moderator')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- yearbook_flags table (AC-ARCH-002a specification)
CREATE TABLE IF NOT EXISTS public.yearbook_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yearbook_id uuid REFERENCES public.yearbooks(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  reason text CHECK (reason IN ('nudity', 'violence', 'copyright')) NOT NULL,
  flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for yearbook_faces
CREATE INDEX IF NOT EXISTS idx_yearbook_faces_page_id ON public.yearbook_faces(page_id);
CREATE INDEX IF NOT EXISTS idx_yearbook_faces_claimed_by ON public.yearbook_faces(claimed_by);
CREATE INDEX IF NOT EXISTS idx_yearbook_faces_verified ON public.yearbook_faces(verified);

-- Indexes for yearbook_claims
CREATE INDEX IF NOT EXISTS idx_yearbook_claims_face_id ON public.yearbook_claims(face_id);
CREATE INDEX IF NOT EXISTS idx_yearbook_claims_user_id ON public.yearbook_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_yearbook_claims_status ON public.yearbook_claims(status);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_school_id ON public.groups(school_id);
CREATE INDEX IF NOT EXISTS idx_groups_type ON public.groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);

-- Index for full-text search on yearbook_pages ocr_text
CREATE INDEX IF NOT EXISTS idx_yearbook_pages_ocr_text ON public.yearbook_pages USING gin(ocr_text);

-- =============================================
-- 5. BASIC ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.yearbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_flags ENABLE ROW LEVEL SECURITY;

-- yearbooks RLS policies
CREATE POLICY "Users can view public yearbooks" ON public.yearbooks
  FOR SELECT USING (status = 'ready');

CREATE POLICY "Users can insert their own yearbooks" ON public.yearbooks
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- yearbook_pages RLS policies
CREATE POLICY "Users can view pages of public yearbooks" ON public.yearbook_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.yearbooks 
      WHERE yearbooks.id = yearbook_pages.yearbook_id 
      AND yearbooks.status = 'ready'
    )
  );

-- yearbook_faces RLS policies
CREATE POLICY "Users can view faces on public pages" ON public.yearbook_faces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.yearbook_pages pages
      JOIN public.yearbooks ON yearbooks.id = pages.yearbook_id
      WHERE pages.id = yearbook_faces.page_id
      AND yearbooks.status = 'ready'
    )
  );

-- yearbook_claims RLS policies
CREATE POLICY "Users can view their own claims" ON public.yearbook_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims" ON public.yearbook_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- groups RLS policies
CREATE POLICY "Users can view public groups" ON public.groups
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Group creators can manage their groups" ON public.groups
  FOR ALL USING (auth.uid() = created_by);

-- group_members RLS policies
CREATE POLICY "Users can view group memberships" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.privacy = 'public'
    )
  );

CREATE POLICY "Users can join public groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- yearbook_flags RLS policies
CREATE POLICY "Users can create flags" ON public.yearbook_flags
  FOR INSERT WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Moderators can view all flags" ON public.yearbook_flags
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.trust_level IN ('moderator', 'staff')
  ));

-- =============================================
-- 6. UPDATE EXISTING DATA TO MATCH NEW SCHEMA
-- =============================================

-- Set default status for existing yearbooks
UPDATE public.yearbooks SET status = 'ready' WHERE status IS NULL;

-- Set uploaded_by for existing yearbooks (if possible)
UPDATE public.yearbooks 
SET uploaded_by = (
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1
) 
WHERE uploaded_by IS NULL;

-- Create initial groups for existing schools
INSERT INTO public.groups (type, school_id, name, description, created_by, privacy)
SELECT 
  'class' as type,
  s.id as school_id,
  'Class of ' || y.year as name,
  'Official class group for ' || s.name || ' ' || y.year,
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) as created_by,
  'public' as privacy
FROM public.yearbooks y
JOIN public.schools s ON y.school_id = s.id
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. VERIFICATION AND VALIDATION
-- =============================================

-- Verify table structures match AC-ARCH-002a specifications
DO $$
BEGIN
  -- Check that required tables exist
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'yearbooks') = 1, 'yearbooks table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'yearbook_pages') = 1, 'yearbook_pages table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'yearbook_faces') = 1, 'yearbook_faces table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'yearbook_claims') = 1, 'yearbook_claims table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'groups') = 1, 'groups table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'group_members') = 1, 'group_members table missing';
  
  -- Check that RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'yearbooks') = true, 'RLS not enabled on yearbooks';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'yearbook_pages') = true, 'RLS not enabled on yearbook_pages';
  
  RAISE NOTICE 'Schema alignment migration completed successfully';
END $$;