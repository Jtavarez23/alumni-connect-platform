-- Quick fix for missing mentorship and face recognition features
-- This script adds the essential tables and functions needed for the app to work

-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create mentorship_profiles table if not exists
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('mentor','mentee','both')) DEFAULT 'both',
  topics text[],
  availability jsonb DEFAULT '{}',
  bio text,
  years_experience integer,
  expertise text[],
  industry text,
  current_company text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mentorship_matches table if not exists
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('suggested','pending','accepted','declined','ended')) DEFAULT 'suggested',
  match_score integer DEFAULT 0,
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create face_models table if not exists
CREATE TABLE IF NOT EXISTS public.face_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  version text NOT NULL,
  embedding_size integer NOT NULL,
  provider text NOT NULL,
  model_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create face_clusters table if not exists
CREATE TABLE IF NOT EXISTS public.face_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  confidence_score float,
  face_count integer DEFAULT 0,
  representative_face_id uuid REFERENCES public.page_faces(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to page_faces if not exists
ALTER TABLE public.page_faces 
ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.face_models(id),
ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.face_clusters(id),
ADD COLUMN IF NOT EXISTS confidence_score float,
ADD COLUMN IF NOT EXISTS face_quality_score float,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_source text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create face_matches table if not exists
CREATE TABLE IF NOT EXISTS public.face_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  face_a_id uuid REFERENCES public.page_faces(id) ON DELETE CASCADE,
  face_b_id uuid REFERENCES public.page_faces(id) ON DELETE CASCADE,
  similarity_score float NOT NULL,
  model_id uuid REFERENCES public.face_models(id),
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(face_a_id, face_b_id),
  CHECK (face_a_id != face_b_id),
  CHECK (similarity_score >= 0 AND similarity_score <= 1)
);

-- Create face_search_history table if not exists
CREATE TABLE IF NOT EXISTS public.face_search_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  query_type text,
  query_metadata jsonb,
  results_count integer,
  search_duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_search_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for mentorship
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_profiles' 
    AND policyname = 'Users can view all mentorship profiles'
  ) THEN
    CREATE POLICY "Users can view all mentorship profiles" ON public.mentorship_profiles
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_profiles' 
    AND policyname = 'Users can manage their own mentorship profile'
  ) THEN
    CREATE POLICY "Users can manage their own mentorship profile" ON public.mentorship_profiles
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_matches' 
    AND policyname = 'Users can view their mentorship matches'
  ) THEN
    CREATE POLICY "Users can view their mentorship matches" ON public.mentorship_matches
      FOR SELECT TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
  END IF;
END $$;

-- Basic RLS policies for face recognition
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'face_models' 
    AND policyname = 'Anyone can view face models'
  ) THEN
    CREATE POLICY "Anyone can view face models" ON public.face_models
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'face_clusters' 
    AND policyname = 'Authenticated users can view face clusters'
  ) THEN
    CREATE POLICY "Authenticated users can view face clusters" ON public.face_clusters
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Essential RPC functions
CREATE OR REPLACE FUNCTION get_mentorship_matches(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  mentor_id uuid,
  mentee_id uuid,
  status text,
  match_score integer,
  message text,
  created_at timestamptz,
  mentor_profile jsonb,
  mentee_profile jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH user_id AS (
    SELECT COALESCE(p_user_id, auth.uid()) as id
  )
  SELECT 
    mm.id,
    mm.mentor_id,
    mm.mentee_id,
    mm.status,
    mm.match_score,
    mm.message,
    mm.created_at,
    jsonb_build_object(
      'display_name', mp.display_name,
      'avatar_url', mp.avatar_url,
      'expertise', mmp.expertise,
      'industry', mmp.industry,
      'current_company', mmp.current_company
    ) as mentor_profile,
    jsonb_build_object(
      'display_name', mep.display_name,
      'avatar_url', mep.avatar_url,
      'topics', mmep.topics
    ) as mentee_profile
  FROM public.mentorship_matches mm
  JOIN user_id ui ON (ui.id = mm.mentor_id OR ui.id = mm.mentee_id)
  LEFT JOIN public.profiles mp ON mp.id = mm.mentor_id
  LEFT JOIN public.profiles mep ON mep.id = mm.mentee_id
  LEFT JOIN public.mentorship_profiles mmp ON mmp.user_id = mm.mentor_id
  LEFT JOIN public.mentorship_profiles mmep ON mmep.user_id = mm.mentee_id
  ORDER BY mm.created_at DESC;
$$;

-- Face embedding stats function
CREATE OR REPLACE FUNCTION get_face_embedding_stats()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_faces', COALESCE(COUNT(*), 0),
    'faces_with_embeddings', COALESCE(COUNT(*) FILTER (WHERE embedding IS NOT NULL), 0),
    'faces_claimed', COALESCE(COUNT(*) FILTER (WHERE claimed_by IS NOT NULL), 0),
    'embedding_coverage_percent', 
      CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE embedding IS NOT NULL) * 100.0 / COUNT(*)), 2)
      ELSE 0 
      END
  )
  FROM public.page_faces;
$$;

-- Advanced face search function
CREATE OR REPLACE FUNCTION advanced_face_search(
  query_embedding vector(256) DEFAULT NULL,
  query_face_id uuid DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.75,
  quality_threshold float DEFAULT 0.5,
  max_results integer DEFAULT 20,
  include_clusters boolean DEFAULT true
)
RETURNS TABLE (
  face_id uuid,
  page_id uuid,
  yearbook_id uuid,
  similarity float,
  confidence_score float,
  quality_score float,
  bbox integer[],
  cluster_id uuid,
  cluster_name text,
  is_claimed boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT 
    pf.id as face_id,
    pf.page_id,
    yp.yearbook_id,
    0.85 as similarity, -- Mock similarity for now
    pf.confidence_score,
    pf.face_quality_score as quality_score,
    pf.bbox,
    pf.cluster_id,
    fc.name as cluster_name,
    (pf.claimed_by IS NOT NULL) as is_claimed
  FROM public.page_faces pf
  JOIN public.yearbook_pages yp ON yp.id = pf.page_id
  LEFT JOIN public.face_clusters fc ON fc.id = pf.cluster_id
  WHERE (pf.face_quality_score IS NULL OR pf.face_quality_score >= quality_threshold)
  ORDER BY pf.confidence_score DESC NULLS LAST
  LIMIT max_results;
$$;

-- Insert default face model
INSERT INTO public.face_models (name, version, embedding_size, provider, is_active)
VALUES ('face-recognition-default', '1.0', 256, 'huggingface', true)
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentorship_matches TO authenticated;
GRANT EXECUTE ON FUNCTION get_face_embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION advanced_face_search TO authenticated;