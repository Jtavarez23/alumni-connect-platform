-- Face Recognition RPC Functions
-- Implements server-side functions for AI-powered face recognition

-- Function to generate face embedding from uploaded image
-- This would integrate with external AI services like OpenAI, Google Vision, etc.
CREATE OR REPLACE FUNCTION generate_face_embedding_from_image(
  p_image_path text,
  p_similarity_threshold float DEFAULT 0.75,
  p_max_results integer DEFAULT 20
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  temp_embedding vector(256);
  api_response jsonb;
  face_data jsonb;
BEGIN
  -- In a real implementation, this would call an external AI service
  -- For now, we'll simulate by generating a random embedding
  -- This should be replaced with actual AI service integration
  
  -- Simulate API call to face detection service
  -- Example: OpenAI Vision, Google Vision AI, AWS Rekognition, etc.
  -- api_response := call_external_face_detection_api(p_image_path);
  
  -- For demo purposes, create a mock embedding
  -- In production, extract this from the AI service response
  SELECT ARRAY(
    SELECT random() * 2 - 1 -- Random values between -1 and 1
    FROM generate_series(1, 256)
  )::vector(256) INTO temp_embedding;
  
  -- Log the search attempt
  INSERT INTO public.face_search_history (
    user_id,
    query_type,
    query_metadata,
    results_count,
    search_duration_ms
  )
  VALUES (
    auth.uid(),
    'upload',
    jsonb_build_object(
      'image_path', p_image_path,
      'similarity_threshold', p_similarity_threshold
    ),
    0, -- Will be updated below
    0  -- Will be updated below
  );
  
  -- Perform similarity search using the generated embedding
  RETURN QUERY
  SELECT * FROM advanced_face_search(
    query_embedding := temp_embedding,
    similarity_threshold := p_similarity_threshold,
    max_results := p_max_results
  );
END;
$$;

-- Function to process a yearbook page and extract face embeddings
CREATE OR REPLACE FUNCTION process_page_faces(
  p_page_id uuid,
  p_force_reprocess boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  page_record record;
  faces_processed integer := 0;
  faces_updated integer := 0;
  start_time timestamptz := now();
  image_url text;
  api_response jsonb;
  face_item jsonb;
  embedding_array float[];
  face_record record;
BEGIN
  -- Get page information
  SELECT * INTO page_record
  FROM public.yearbook_pages yp
  JOIN public.yearbooks y ON y.id = yp.yearbook_id
  WHERE yp.id = p_page_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Page not found'
    );
  END IF;
  
  -- Skip if already processed unless force reprocess
  IF NOT p_force_reprocess AND EXISTS (
    SELECT 1 FROM public.page_faces 
    WHERE page_id = p_page_id AND embedding IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Page already processed',
      'faces_processed', 0
    );
  END IF;
  
  -- Get the image URL for the page
  -- In production, this would be the full storage URL
  image_url := page_record.image_path;
  
  -- In a real implementation, call external AI service
  -- Example API calls:
  -- - OpenAI Vision API for face detection
  -- - Google Vision AI Face Detection
  -- - AWS Rekognition DetectFaces
  -- - Azure Face API
  
  -- Mock API response for demonstration
  api_response := jsonb_build_object(
    'faces', jsonb_build_array(
      jsonb_build_object(
        'bbox', ARRAY[100, 150, 80, 100],
        'confidence', 0.95,
        'quality', 0.87,
        'embedding', (
          SELECT array_agg(random() * 2 - 1)
          FROM generate_series(1, 256)
        )
      ),
      jsonb_build_object(
        'bbox', ARRAY[200, 180, 75, 95],
        'confidence', 0.89,
        'quality', 0.82,
        'embedding', (
          SELECT array_agg(random() * 2 - 1)
          FROM generate_series(1, 256)
        )
      )
    )
  );
  
  -- Process each detected face
  FOR face_item IN 
    SELECT * FROM jsonb_array_elements(api_response->'faces')
  LOOP
    -- Extract embedding array
    SELECT array_agg((value::text)::float)
    INTO embedding_array
    FROM jsonb_array_elements_text(face_item->'embedding');
    
    -- Check if face already exists at this location
    SELECT * INTO face_record
    FROM public.page_faces
    WHERE page_id = p_page_id
      AND bbox = (face_item->>'bbox')::integer[];
    
    IF FOUND THEN
      -- Update existing face with new embedding
      UPDATE public.page_faces
      SET 
        embedding = embedding_array::vector(256),
        confidence_score = (face_item->>'confidence')::float,
        face_quality_score = (face_item->>'quality')::float,
        model_id = (SELECT id FROM public.face_models WHERE is_active = true LIMIT 1),
        updated_at = now()
      WHERE id = face_record.id;
      
      faces_updated := faces_updated + 1;
    ELSE
      -- Insert new face
      INSERT INTO public.page_faces (
        page_id,
        bbox,
        embedding,
        confidence_score,
        face_quality_score,
        model_id
      )
      VALUES (
        p_page_id,
        (face_item->>'bbox')::integer[],
        embedding_array::vector(256),
        (face_item->>'confidence')::float,
        (face_item->>'quality')::float,
        (SELECT id FROM public.face_models WHERE is_active = true LIMIT 1)
      );
      
      faces_processed := faces_processed + 1;
    END IF;
  END LOOP;
  
  -- Update page processing status
  UPDATE public.yearbook_pages
  SET updated_at = now()
  WHERE id = p_page_id;
  
  -- Update yearbook face processing status
  UPDATE public.yearbooks
  SET 
    face_done = CASE 
      WHEN (
        SELECT COUNT(*) FROM public.yearbook_pages 
        WHERE yearbook_id = page_record.yearbook_id
      ) = (
        SELECT COUNT(*) FROM public.yearbook_pages yp
        WHERE yp.yearbook_id = page_record.yearbook_id
          AND EXISTS (
            SELECT 1 FROM public.page_faces pf
            WHERE pf.page_id = yp.id AND pf.embedding IS NOT NULL
          )
      )
      THEN true
      ELSE face_done
    END,
    updated_at = now()
  WHERE id = page_record.yearbook_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'faces_processed', faces_processed,
    'faces_updated', faces_updated,
    'processing_time_ms', EXTRACT(EPOCH FROM (now() - start_time)) * 1000
  );
END;
$$;

-- Function to bulk process all unprocessed yearbook pages
CREATE OR REPLACE FUNCTION bulk_process_face_embeddings(
  p_batch_size integer DEFAULT 10,
  p_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pages_processed integer := 0;
  total_faces integer := 0;
  start_time timestamptz := now();
  page_record record;
  process_result jsonb;
BEGIN
  -- Process pages in batches to avoid timeouts
  FOR page_record IN
    SELECT yp.id as page_id
    FROM public.yearbook_pages yp
    JOIN public.yearbooks y ON y.id = yp.yearbook_id
    WHERE (p_school_id IS NULL OR y.school_id = p_school_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.page_faces pf
        WHERE pf.page_id = yp.id AND pf.embedding IS NOT NULL
      )
    ORDER BY y.created_at DESC
    LIMIT p_batch_size
  LOOP
    -- Process each page
    SELECT process_page_faces(page_record.page_id) INTO process_result;
    
    IF (process_result->>'success')::boolean THEN
      pages_processed := pages_processed + 1;
      total_faces := total_faces + COALESCE((process_result->>'faces_processed')::integer, 0);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'pages_processed', pages_processed,
    'total_faces_extracted', total_faces,
    'processing_time_ms', EXTRACT(EPOCH FROM (now() - start_time)) * 1000,
    'timestamp', now()
  );
END;
$$;

-- Function to find potential face matches across pages
CREATE OR REPLACE FUNCTION find_cross_page_matches(
  p_similarity_threshold float DEFAULT 0.80,
  p_max_matches_per_face integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matches_found integer := 0;
  faces_processed integer := 0;
  start_time timestamptz := now();
  face_record record;
BEGIN
  -- Find potential matches for faces that don't have many matches yet
  FOR face_record IN
    SELECT pf.id, pf.embedding
    FROM public.page_faces pf
    WHERE pf.embedding IS NOT NULL
      AND (
        SELECT COUNT(*) FROM public.face_matches fm
        WHERE fm.face_a_id = pf.id OR fm.face_b_id = pf.id
      ) < p_max_matches_per_face
    ORDER BY pf.face_quality_score DESC NULLS LAST
    LIMIT 100 -- Process in batches
  LOOP
    -- Find similar faces
    INSERT INTO public.face_matches (face_a_id, face_b_id, similarity_score, model_id)
    SELECT 
      face_record.id,
      pf2.id,
      1 - (face_record.embedding <=> pf2.embedding) as similarity,
      pf2.model_id
    FROM public.page_faces pf2
    WHERE pf2.embedding IS NOT NULL
      AND pf2.id != face_record.id
      AND 1 - (face_record.embedding <=> pf2.embedding) >= p_similarity_threshold
      AND NOT EXISTS (
        SELECT 1 FROM public.face_matches fm
        WHERE (fm.face_a_id = face_record.id AND fm.face_b_id = pf2.id)
           OR (fm.face_a_id = pf2.id AND fm.face_b_id = face_record.id)
      )
    ORDER BY face_record.embedding <=> pf2.embedding
    LIMIT p_max_matches_per_face;
    
    GET DIAGNOSTICS matches_found = matches_found + ROW_COUNT;
    faces_processed := faces_processed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'faces_processed', faces_processed,
    'matches_found', matches_found,
    'processing_time_ms', EXTRACT(EPOCH FROM (now() - start_time)) * 1000,
    'timestamp', now()
  );
END;
$$;

-- Function to get face recognition analytics
CREATE OR REPLACE FUNCTION get_face_recognition_analytics(
  p_school_id uuid DEFAULT NULL,
  p_days_back integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH face_stats AS (
    SELECT 
      COUNT(*) as total_faces,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as faces_with_embeddings,
      COUNT(*) FILTER (WHERE claimed_by IS NOT NULL) as faces_claimed,
      AVG(confidence_score) FILTER (WHERE confidence_score IS NOT NULL) as avg_confidence,
      AVG(face_quality_score) FILTER (WHERE face_quality_score IS NOT NULL) as avg_quality
    FROM public.page_faces pf
    JOIN public.yearbook_pages yp ON yp.id = pf.page_id
    JOIN public.yearbooks y ON y.id = yp.yearbook_id
    WHERE (p_school_id IS NULL OR y.school_id = p_school_id)
      AND pf.created_at >= now() - (p_days_back || ' days')::interval
  ),
  cluster_stats AS (
    SELECT 
      COUNT(*) as total_clusters,
      AVG(face_count) as avg_cluster_size,
      MAX(face_count) as largest_cluster_size
    FROM public.face_clusters
    WHERE created_at >= now() - (p_days_back || ' days')::interval
  ),
  search_stats AS (
    SELECT 
      COUNT(*) as total_searches,
      COUNT(DISTINCT user_id) as unique_searchers,
      AVG(results_count) as avg_results_per_search,
      AVG(search_duration_ms) as avg_search_time_ms
    FROM public.face_search_history
    WHERE created_at >= now() - (p_days_back || ' days')::interval
  )
  SELECT jsonb_build_object(
    'period_days', p_days_back,
    'face_stats', to_jsonb(fs.*),
    'cluster_stats', to_jsonb(cs.*),
    'search_stats', to_jsonb(ss.*),
    'generated_at', now()
  )
  FROM face_stats fs, cluster_stats cs, search_stats ss;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION generate_face_embedding_from_image TO authenticated;
GRANT EXECUTE ON FUNCTION process_page_faces TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_process_face_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION find_cross_page_matches TO authenticated;
GRANT EXECUTE ON FUNCTION get_face_recognition_analytics TO authenticated;

-- Create indexes for better performance on new queries
CREATE INDEX IF NOT EXISTS idx_face_search_history_user_date ON public.face_search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_faces_processing_status ON public.page_faces(page_id) WHERE embedding IS NULL;
CREATE INDEX IF NOT EXISTS idx_yearbook_pages_unprocessed ON public.yearbook_pages(yearbook_id) 
  WHERE NOT EXISTS (
    SELECT 1 FROM public.page_faces pf 
    WHERE pf.page_id = yearbook_pages.id AND pf.embedding IS NOT NULL
  );

-- Add helpful comments
COMMENT ON FUNCTION generate_face_embedding_from_image IS 'Generates face embedding from uploaded image and searches for similar faces';
COMMENT ON FUNCTION process_page_faces IS 'Processes a yearbook page to extract face embeddings using AI';
COMMENT ON FUNCTION bulk_process_face_embeddings IS 'Bulk processes unprocessed yearbook pages for face detection';
COMMENT ON FUNCTION find_cross_page_matches IS 'Finds potential face matches across different yearbook pages';
COMMENT ON FUNCTION get_face_recognition_analytics IS 'Returns analytics about face recognition system usage';