-- Create all missing tables before applying RLS policies
-- Run this entire script first

-- =============================================
-- 1. YEARBOOK TABLES
-- =============================================

-- yearbook_faces table
CREATE TABLE IF NOT EXISTS public.yearbook_faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox jsonb NOT NULL,
  detected_name text,
  claimed_by uuid REFERENCES auth.users(id),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- yearbook_claims table
CREATE TABLE IF NOT EXISTS public.yearbook_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id uuid REFERENCES public.yearbook_faces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(face_id, user_id)
);

-- =============================================
-- 2. SOCIAL TABLES
-- =============================================

-- connections table (if not exists)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

-- posts table (if not exists)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  privacy text CHECK (privacy IN ('public', 'connections', 'private')) DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- comments table (if not exists)
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. ACTIVITY TABLES
-- =============================================

-- notifications table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- activity_feed table (if not exists)
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb,
  visibility text CHECK (visibility IN ('public', 'connections', 'private')) DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. EDUCATION TABLE
-- =============================================

-- user_education table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id),
  degree text,
  field_of_study text,
  start_year integer,
  end_year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Verify all tables were created
SELECT 
  table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
       THEN '✓' ELSE '✗' END as exists
FROM (VALUES 
  ('yearbook_faces'),
  ('yearbook_claims'),
  ('connections'),
  ('posts'),
  ('comments'),
  ('notifications'),
  ('activity_feed'),
  ('user_education')
) AS t(table_name);