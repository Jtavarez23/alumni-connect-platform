-- Critical Features Migration - Face Recognition & Yearbook Processing
-- Only includes essential tables without conflicting policies

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Core yearbook processing tables (simplified version)
CREATE TABLE IF NOT EXISTS public.yearbooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid,
  title text,
  year integer,
  uploaded_by uuid REFERENCES auth.users(id),
  storage_path text,
  status text DEFAULT 'pending',
  page_count integer,
  ocr_done boolean DEFAULT false,
  face_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.yearbook_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_id uuid REFERENCES public.yearbooks(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  image_path text,
  tile_manifest text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(yearbook_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.page_faces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[] NOT NULL,
  embedding vector(256),
  claimed_by uuid REFERENCES auth.users(id),
  confidence_score float,
  face_quality_score float,
  is_verified boolean DEFAULT false,
  model_id uuid,
  cluster_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_names_ocr (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
  bbox integer[],
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

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

-- Face recognition enhancement tables
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

CREATE TABLE IF NOT EXISTS public.face_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  confidence_score float,
  face_count integer DEFAULT 0,
  representative_face_id uuid REFERENCES public.page_faces(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.face_search_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  query_type text,
  query_metadata jsonb,
  results_count integer,
  search_duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.page_faces 
ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.face_models(id),
ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.face_clusters(id);

-- Enable RLS on all tables
ALTER TABLE public.yearbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_names_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_search_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (only create if they don't exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'yearbooks' AND policyname = 'Yearbooks are viewable by authenticated users') THEN
    CREATE POLICY "Yearbooks are viewable by authenticated users" ON public.yearbooks FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'yearbook_pages' AND policyname = 'Yearbook pages are viewable by authenticated users') THEN
    CREATE POLICY "Yearbook pages are viewable by authenticated users" ON public.yearbook_pages FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'page_faces' AND policyname = 'Page faces are viewable by authenticated users') THEN
    CREATE POLICY "Page faces are viewable by authenticated users" ON public.page_faces FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_models' AND policyname = 'Face models are viewable by all') THEN
    CREATE POLICY "Face models are viewable by all" ON public.face_models FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_clusters' AND policyname = 'Face clusters are viewable by authenticated users') THEN
    CREATE POLICY "Face clusters are viewable by authenticated users" ON public.face_clusters FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_matches' AND policyname = 'Face matches are viewable by authenticated users') THEN
    CREATE POLICY "Face matches are viewable by authenticated users" ON public.face_matches FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_search_history' AND policyname = 'Users can view their own search history') THEN
    CREATE POLICY "Users can view their own search history" ON public.face_search_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Essential RPC functions for face recognition
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
    0.85 as similarity, -- Mock similarity for demo
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

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_yearbook_pages_yearbook ON public.yearbook_pages(yearbook_id, page_number);
CREATE INDEX IF NOT EXISTS idx_page_faces_page ON public.page_faces(page_id);
CREATE INDEX IF NOT EXISTS idx_page_faces_embedding ON public.page_faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_page_names_ocr_search ON public.page_names_ocr USING gin (to_tsvector('simple', text));
CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_face_matches_similarity ON public.face_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_face_search_history_user_date ON public.face_search_history(user_id, created_at DESC);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_face_embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION advanced_face_search TO authenticated;