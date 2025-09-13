-- Enable pgvector extension for face embeddings
-- This enables vector similarity search capabilities for face recognition

-- Create the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE EXCEPTION 'pgvector extension failed to install';
  END IF;
END $$;

-- Add comments to existing face embeddings table
COMMENT ON TABLE public.page_faces IS 'Stores detected faces from yearbook pages with optional vector embeddings for face matching';
COMMENT ON COLUMN public.page_faces.embedding IS 'Face embedding vector (256 dimensions) for similarity search and face matching';

-- Create index on face embeddings for efficient vector similarity search
CREATE INDEX IF NOT EXISTS idx_page_faces_embedding ON public.page_faces 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add a function to find similar faces
CREATE OR REPLACE FUNCTION find_similar_faces(
  query_embedding vector(256),
  similarity_threshold float DEFAULT 0.8,
  max_results integer DEFAULT 10
)
RETURNS TABLE (
  face_id uuid,
  page_id uuid,
  similarity float,
  bbox integer[]
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT 
    pf.id as face_id,
    pf.page_id,
    1 - (pf.embedding <=> query_embedding) as similarity,
    pf.bbox
  FROM public.page_faces pf
  WHERE pf.embedding IS NOT NULL
    AND 1 - (pf.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY pf.embedding <=> query_embedding
  LIMIT max_results;
$$;

-- Add function to get face embedding statistics
CREATE OR REPLACE FUNCTION get_face_embedding_stats()
RETURNS json
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_faces', COUNT(*),
    'faces_with_embeddings', COUNT(*) FILTER (WHERE embedding IS NOT NULL),
    'faces_claimed', COUNT(*) FILTER (WHERE claimed_by IS NOT NULL),
    'embedding_coverage_percent', 
      ROUND(
        (COUNT(*) FILTER (WHERE embedding IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0)), 
        2
      )
  )
  FROM public.page_faces;
$$;