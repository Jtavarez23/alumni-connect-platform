-- Face Embeddings System with pgvector
-- Advanced face recognition and search capabilities using vector similarity
-- Part of Sprint 6: P2 Features for monetization-ready platform

-- =============================================
-- FACE EMBEDDINGS TABLES
-- =============================================

-- Face embeddings storage with vector similarity search
CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yearbook_page_id UUID NOT NULL REFERENCES public.yearbook_pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Linked after claiming
    face_id VARCHAR(255) NOT NULL, -- Unique identifier for this face
    bounding_box JSONB NOT NULL, -- {x, y, width, height} coordinates
    embedding vector(512), -- 512-dimensional face embedding
    confidence_score FLOAT NOT NULL DEFAULT 0.0, -- Detection confidence (0-1)
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'user_confirmed', 'admin_verified')),
    metadata JSONB DEFAULT '{}', -- Additional face detection metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Face clusters for grouping similar faces
CREATE TABLE IF NOT EXISTS public.face_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_name VARCHAR(255), -- Optional name for the cluster
    representative_face_id UUID REFERENCES public.face_embeddings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who claimed this cluster
    confidence_threshold FLOAT DEFAULT 0.75, -- Similarity threshold for cluster membership
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many relationship between faces and clusters
CREATE TABLE IF NOT EXISTS public.face_cluster_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    face_embedding_id UUID NOT NULL REFERENCES public.face_embeddings(id) ON DELETE CASCADE,
    face_cluster_id UUID NOT NULL REFERENCES public.face_clusters(id) ON DELETE CASCADE,
    similarity_score FLOAT NOT NULL DEFAULT 0.0, -- How similar this face is to the cluster
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(face_embedding_id, face_cluster_id)
);

-- Face search queries and results for analytics
CREATE TABLE IF NOT EXISTS public.face_search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    query_type TEXT NOT NULL CHECK (query_type IN ('face_upload', 'similar_faces', 'cluster_search')),
    query_embedding vector(512), -- The embedding used for search
    results_count INTEGER DEFAULT 0,
    search_metadata JSONB DEFAULT '{}', -- Search parameters and context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Vector similarity search index (HNSW for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_face_embeddings_vector ON public.face_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Traditional indexes
CREATE INDEX IF NOT EXISTS idx_face_embeddings_yearbook_page ON public.face_embeddings(yearbook_page_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user ON public.face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_face_id ON public.face_embeddings(face_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_confidence ON public.face_embeddings(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_face_clusters_user ON public.face_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_face_cluster_members_face ON public.face_cluster_members(face_embedding_id);
CREATE INDEX IF NOT EXISTS idx_face_cluster_members_cluster ON public.face_cluster_members(face_cluster_id);
CREATE INDEX IF NOT EXISTS idx_face_search_queries_user ON public.face_search_queries(user_id, created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Face embeddings - readable by authenticated users, writable by service role
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Face embeddings readable by authenticated users" ON public.face_embeddings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Face embeddings writable by service role" ON public.face_embeddings
    FOR ALL TO service_role USING (true);

-- Face clusters - users can see their own clusters and public ones
ALTER TABLE public.face_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own face clusters" ON public.face_clusters
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can see public face clusters" ON public.face_clusters
    FOR SELECT USING (user_id IS NOT NULL); -- Public clusters have a user_id

-- Face cluster members - readable by authenticated users
ALTER TABLE public.face_cluster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Face cluster members readable" ON public.face_cluster_members
    FOR SELECT TO authenticated USING (true);

-- Face search queries - users can only see their own
ALTER TABLE public.face_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own face searches" ON public.face_search_queries
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FACE SIMILARITY FUNCTIONS
-- =============================================

-- Function to find similar faces using vector similarity
CREATE OR REPLACE FUNCTION public.find_similar_faces(
    p_query_embedding vector(512),
    p_similarity_threshold FLOAT DEFAULT 0.75,
    p_limit INTEGER DEFAULT 10,
    p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    face_id UUID,
    yearbook_page_id UUID,
    user_id UUID,
    face_data JSONB,
    similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fe.id as face_id,
        fe.yearbook_page_id,
        fe.user_id,
        jsonb_build_object(
            'face_id', fe.face_id,
            'bounding_box', fe.bounding_box,
            'confidence_score', fe.confidence_score,
            'verification_status', fe.verification_status,
            'metadata', fe.metadata
        ) as face_data,
        (1 - (fe.embedding <=> p_query_embedding)) as similarity_score
    FROM public.face_embeddings fe
    WHERE 
        fe.embedding IS NOT NULL
        AND (1 - (fe.embedding <=> p_query_embedding)) >= p_similarity_threshold
        AND (p_exclude_user_id IS NULL OR fe.user_id != p_exclude_user_id)
        AND fe.confidence_score > 0.5 -- Only high-confidence faces
    ORDER BY fe.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- Function to create or update a face cluster
CREATE OR REPLACE FUNCTION public.create_face_cluster(
    p_cluster_name VARCHAR(255) DEFAULT NULL,
    p_representative_face_id UUID DEFAULT NULL,
    p_confidence_threshold FLOAT DEFAULT 0.75
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_cluster_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    INSERT INTO public.face_clusters (
        cluster_name,
        representative_face_id,
        user_id,
        confidence_threshold
    ) VALUES (
        p_cluster_name,
        p_representative_face_id,
        v_user_id,
        p_confidence_threshold
    )
    RETURNING id INTO v_cluster_id;
    
    RETURN v_cluster_id;
END;
$$;

-- Function to add face to cluster
CREATE OR REPLACE FUNCTION public.add_face_to_cluster(
    p_face_embedding_id UUID,
    p_face_cluster_id UUID,
    p_similarity_score FLOAT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_calculated_similarity FLOAT;
    v_representative_embedding vector(512);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate similarity if not provided
    IF p_similarity_score IS NULL THEN
        SELECT fe.embedding INTO v_representative_embedding
        FROM public.face_embeddings fe
        JOIN public.face_clusters fc ON fc.representative_face_id = fe.id
        WHERE fc.id = p_face_cluster_id;
        
        IF v_representative_embedding IS NOT NULL THEN
            SELECT (1 - (fe.embedding <=> v_representative_embedding))
            INTO v_calculated_similarity
            FROM public.face_embeddings fe
            WHERE fe.id = p_face_embedding_id;
        ELSE
            v_calculated_similarity := 0.0;
        END IF;
    ELSE
        v_calculated_similarity := p_similarity_score;
    END IF;
    
    INSERT INTO public.face_cluster_members (
        face_embedding_id,
        face_cluster_id,
        similarity_score
    ) VALUES (
        p_face_embedding_id,
        p_face_cluster_id,
        v_calculated_similarity
    )
    ON CONFLICT (face_embedding_id, face_cluster_id) DO UPDATE SET
        similarity_score = EXCLUDED.similarity_score;
    
    -- Update cluster member count
    UPDATE public.face_clusters
    SET member_count = (
        SELECT COUNT(*) FROM public.face_cluster_members 
        WHERE face_cluster_id = p_face_cluster_id
    ),
    updated_at = NOW()
    WHERE id = p_face_cluster_id;
    
    RETURN TRUE;
END;
$$;

-- Function to search faces by uploading a photo
CREATE OR REPLACE FUNCTION public.search_faces_by_photo(
    p_photo_embedding vector(512),
    p_similarity_threshold FLOAT DEFAULT 0.75,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    results JSONB,
    total_results INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_results JSONB;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Record the search query
    INSERT INTO public.face_search_queries (
        user_id,
        query_type,
        query_embedding,
        search_metadata
    ) VALUES (
        v_user_id,
        'face_upload',
        p_photo_embedding,
        jsonb_build_object(
            'similarity_threshold', p_similarity_threshold,
            'limit', p_limit
        )
    );
    
    -- Perform the search
    WITH similar_faces AS (
        SELECT 
            fe.id,
            fe.yearbook_page_id,
            fe.user_id,
            fe.face_id,
            fe.bounding_box,
            fe.confidence_score,
            fe.verification_status,
            (1 - (fe.embedding <=> p_photo_embedding)) as similarity,
            yp.yearbook_id,
            yp.page_number,
            yb.title as yearbook_title,
            yb.year,
            s.name as school_name,
            -- User info if claimed
            CASE 
                WHEN fe.user_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', p.id,
                        'first_name', p.first_name,
                        'last_name', p.last_name,
                        'avatar_url', p.avatar_url
                    )
                ELSE NULL
            END as user_info
        FROM public.face_embeddings fe
        LEFT JOIN public.yearbook_pages yp ON fe.yearbook_page_id = yp.id
        LEFT JOIN public.yearbooks yb ON yp.yearbook_id = yb.id
        LEFT JOIN public.schools s ON yb.school_id = s.id
        LEFT JOIN public.profiles p ON fe.user_id = p.id
        WHERE 
            fe.embedding IS NOT NULL
            AND (1 - (fe.embedding <=> p_photo_embedding)) >= p_similarity_threshold
            AND fe.confidence_score > 0.5
        ORDER BY fe.embedding <=> p_photo_embedding
        LIMIT p_limit
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'face_id', sf.id,
                'similarity_score', sf.similarity,
                'confidence_score', sf.confidence_score,
                'bounding_box', sf.bounding_box,
                'verification_status', sf.verification_status,
                'yearbook', jsonb_build_object(
                    'id', sf.yearbook_id,
                    'title', sf.yearbook_title,
                    'year', sf.year,
                    'school_name', sf.school_name,
                    'page_number', sf.page_number
                ),
                'user', sf.user_info
            )
            ORDER BY sf.similarity DESC
        ) as search_results,
        COUNT(*) as result_count
    INTO v_results, v_count
    FROM similar_faces sf;
    
    -- Update search query with results count
    UPDATE public.face_search_queries
    SET results_count = v_count
    WHERE user_id = v_user_id 
    AND query_type = 'face_upload'
    AND created_at = (
        SELECT MAX(created_at) FROM public.face_search_queries 
        WHERE user_id = v_user_id AND query_type = 'face_upload'
    );
    
    RETURN QUERY SELECT v_results, v_count;
END;
$$;

-- Function to get face clusters for a user
CREATE OR REPLACE FUNCTION public.get_user_face_clusters()
RETURNS TABLE (
    cluster_id UUID,
    cluster_name VARCHAR(255),
    member_count INTEGER,
    representative_face JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        fc.id as cluster_id,
        fc.cluster_name,
        fc.member_count,
        CASE 
            WHEN fe.id IS NOT NULL THEN
                jsonb_build_object(
                    'face_id', fe.face_id,
                    'bounding_box', fe.bounding_box,
                    'confidence_score', fe.confidence_score,
                    'yearbook_page_id', fe.yearbook_page_id
                )
            ELSE NULL
        END as representative_face,
        fc.created_at
    FROM public.face_clusters fc
    LEFT JOIN public.face_embeddings fe ON fc.representative_face_id = fe.id
    WHERE fc.user_id = v_user_id
    ORDER BY fc.created_at DESC;
END;
$$;