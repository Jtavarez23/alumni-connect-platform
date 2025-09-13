-- Enhanced Face Embeddings Schema
-- Extends the existing face detection system with advanced features

-- Create face_models table to track different ML models used
CREATE TABLE IF NOT EXISTS public.face_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  version text NOT NULL,
  embedding_size integer NOT NULL,
  provider text NOT NULL, -- 'openai', 'anthropic', 'google', 'aws', 'azure', 'huggingface'
  model_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create face_clusters table for grouping similar faces
CREATE TABLE IF NOT EXISTS public.face_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text, -- optional human-readable name
  confidence_score float,
  face_count integer DEFAULT 0,
  representative_face_id uuid REFERENCES public.page_faces(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add model_id and cluster_id to page_faces
ALTER TABLE public.page_faces 
ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.face_models(id),
ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.face_clusters(id),
ADD COLUMN IF NOT EXISTS confidence_score float,
ADD COLUMN IF NOT EXISTS face_quality_score float, -- 0-1 scale for face detection quality
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_source text, -- 'manual', 'ai', 'crowd'
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create face_matches table for storing similarity relationships
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

-- Create face_search_history for tracking searches
CREATE TABLE IF NOT EXISTS public.face_search_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  query_type text, -- 'upload', 'existing_face', 'user_photo'
  query_metadata jsonb, -- stores info about the search query
  results_count integer,
  search_duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Insert default face model
INSERT INTO public.face_models (name, version, embedding_size, provider, is_active)
VALUES ('face-recognition-default', '1.0', 256, 'huggingface', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_faces_model ON public.page_faces(model_id);
CREATE INDEX IF NOT EXISTS idx_page_faces_cluster ON public.page_faces(cluster_id);
CREATE INDEX IF NOT EXISTS idx_page_faces_confidence ON public.page_faces(confidence_score DESC) WHERE confidence_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_faces_quality ON public.page_faces(face_quality_score DESC) WHERE face_quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_face_matches_similarity ON public.face_matches(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_face_matches_faces ON public.face_matches(face_a_id, face_b_id);
CREATE INDEX IF NOT EXISTS idx_face_clusters_count ON public.face_clusters(face_count DESC);

-- Advanced face search function with multiple query types
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
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  WITH search_embedding AS (
    SELECT COALESCE(
      query_embedding,
      (SELECT embedding FROM public.page_faces WHERE id = query_face_id),
      (SELECT face_embedding FROM public.profiles WHERE user_id = advanced_face_search.user_id)
    ) as embedding
  ),
  face_results AS (
    SELECT 
      pf.id as face_id,
      pf.page_id,
      yp.yearbook_id,
      CASE 
        WHEN se.embedding IS NOT NULL 
        THEN 1 - (pf.embedding <=> se.embedding)
        ELSE 0
      END as similarity,
      pf.confidence_score,
      pf.face_quality_score as quality_score,
      pf.bbox,
      pf.cluster_id,
      fc.name as cluster_name,
      (pf.claimed_by IS NOT NULL) as is_claimed
    FROM public.page_faces pf
    JOIN public.yearbook_pages yp ON yp.id = pf.page_id
    LEFT JOIN public.face_clusters fc ON fc.id = pf.cluster_id
    CROSS JOIN search_embedding se
    WHERE pf.embedding IS NOT NULL
      AND se.embedding IS NOT NULL
      AND (pf.face_quality_score IS NULL OR pf.face_quality_score >= quality_threshold)
      AND 1 - (pf.embedding <=> se.embedding) >= similarity_threshold
  )
  SELECT * FROM face_results
  ORDER BY similarity DESC, quality_score DESC NULLS LAST
  LIMIT max_results;
$$;

-- Function to create or update face clusters
CREATE OR REPLACE FUNCTION update_face_clusters(
  similarity_threshold float DEFAULT 0.85,
  min_cluster_size integer DEFAULT 2
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clusters_created integer := 0;
  clusters_updated integer := 0;
  faces_processed integer := 0;
BEGIN
  -- This is a simplified clustering approach
  -- In production, you'd want a more sophisticated clustering algorithm
  
  -- Clear existing clusters
  UPDATE public.page_faces SET cluster_id = NULL;
  DELETE FROM public.face_clusters;
  
  -- Create clusters based on high similarity matches
  WITH similar_faces AS (
    SELECT DISTINCT 
      LEAST(fm.face_a_id, fm.face_b_id) as primary_face,
      GREATEST(fm.face_a_id, fm.face_b_id) as secondary_face,
      fm.similarity_score
    FROM public.face_matches fm
    WHERE fm.similarity_score >= similarity_threshold
  ),
  face_groups AS (
    SELECT 
      primary_face,
      array_agg(secondary_face) as similar_faces,
      count(*) as group_size
    FROM similar_faces
    GROUP BY primary_face
    HAVING count(*) >= min_cluster_size - 1
  )
  INSERT INTO public.face_clusters (representative_face_id, face_count)
  SELECT 
    fg.primary_face,
    fg.group_size + 1
  FROM face_groups fg;
  
  GET DIAGNOSTICS clusters_created = ROW_COUNT;
  
  -- Update face records with cluster assignments
  WITH cluster_assignments AS (
    SELECT 
      fc.id as cluster_id,
      fc.representative_face_id as primary_face
    FROM public.face_clusters fc
  ),
  faces_to_update AS (
    SELECT 
      fm.face_a_id as face_id,
      ca.cluster_id
    FROM public.face_matches fm
    JOIN cluster_assignments ca ON ca.primary_face = fm.face_b_id
    WHERE fm.similarity_score >= similarity_threshold
    
    UNION
    
    SELECT 
      fm.face_b_id as face_id,
      ca.cluster_id
    FROM public.face_matches fm
    JOIN cluster_assignments ca ON ca.primary_face = fm.face_a_id
    WHERE fm.similarity_score >= similarity_threshold
    
    UNION
    
    SELECT 
      ca.primary_face as face_id,
      ca.cluster_id
    FROM cluster_assignments ca
  )
  UPDATE public.page_faces pf
  SET 
    cluster_id = ftu.cluster_id,
    updated_at = now()
  FROM faces_to_update ftu
  WHERE pf.id = ftu.face_id;
  
  GET DIAGNOSTICS faces_processed = ROW_COUNT;
  
  RETURN json_build_object(
    'clusters_created', clusters_created,
    'faces_clustered', faces_processed,
    'timestamp', now()
  );
END;
$$;

-- Function to batch process face similarities
CREATE OR REPLACE FUNCTION batch_compute_face_similarities(
  batch_size integer DEFAULT 1000,
  similarity_threshold float DEFAULT 0.7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed integer := 0;
  matches_found integer := 0;
  start_time timestamptz := now();
BEGIN
  -- Clear existing matches below threshold
  DELETE FROM public.face_matches WHERE similarity_score < similarity_threshold;
  
  -- Compute similarities in batches to avoid memory issues
  WITH face_pairs AS (
    SELECT 
      a.id as face_a_id,
      b.id as face_b_id,
      1 - (a.embedding <=> b.embedding) as similarity
    FROM public.page_faces a
    JOIN public.page_faces b ON b.id > a.id
    WHERE a.embedding IS NOT NULL 
      AND b.embedding IS NOT NULL
    LIMIT batch_size
  )
  INSERT INTO public.face_matches (face_a_id, face_b_id, similarity_score)
  SELECT face_a_id, face_b_id, similarity
  FROM face_pairs
  WHERE similarity >= similarity_threshold
  ON CONFLICT (face_a_id, face_b_id) DO UPDATE SET
    similarity_score = EXCLUDED.similarity_score,
    created_at = now();
  
  GET DIAGNOSTICS matches_found = ROW_COUNT;
  
  RETURN json_build_object(
    'matches_computed', matches_found,
    'processing_time_ms', EXTRACT(EPOCH FROM (now() - start_time)) * 1000,
    'timestamp', now()
  );
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.face_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for face_models (read-only for most users)
CREATE POLICY "Anyone can view face models" ON public.face_models
  FOR SELECT USING (true);

-- RLS Policies for face_clusters (visible to all authenticated users)
CREATE POLICY "Authenticated users can view face clusters" ON public.face_clusters
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for face_matches (visible to all authenticated users)
CREATE POLICY "Authenticated users can view face matches" ON public.face_matches
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for face_search_history (users can see their own searches)
CREATE POLICY "Users can view their own search history" ON public.face_search_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search history" ON public.face_search_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_faces_updated_at 
  BEFORE UPDATE ON public.page_faces 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_face_clusters_updated_at 
  BEFORE UPDATE ON public.face_clusters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_face_models_updated_at 
  BEFORE UPDATE ON public.face_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();