-- Advanced Feed Scoring System
-- Implements sophisticated algorithms for personalized content recommendations
-- Part of Sprint 6: P2 Features for monetization-ready platform

-- =============================================
-- FEED SCORING EXTENSIONS
-- =============================================

-- Enable pgvector extension for vector similarity (for future face embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- FEED SCORING TABLES
-- =============================================

-- User interaction weights for personalization
CREATE TABLE IF NOT EXISTS public.user_feed_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_weights JSONB DEFAULT '{}', -- Weights for different content categories
    school_affinity FLOAT DEFAULT 1.0,  -- Preference for same school content
    recency_preference FLOAT DEFAULT 0.7, -- How much user prefers recent content (0-1)
    engagement_threshold FLOAT DEFAULT 0.1, -- Minimum engagement score to show
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Content engagement tracking for scoring
CREATE TABLE IF NOT EXISTS public.content_engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    trending_score FLOAT DEFAULT 0.0,
    quality_score FLOAT DEFAULT 0.0,
    relevance_score FLOAT DEFAULT 0.0,
    engagement_velocity FLOAT DEFAULT 0.0, -- Rate of engagement over time
    school_popularity JSONB DEFAULT '{}', -- Popularity per school
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id)
);

-- User content interaction history for learning preferences
CREATE TABLE IF NOT EXISTS public.user_content_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'comment', 'share', 'hide', 'report')),
    interaction_weight FLOAT DEFAULT 1.0,
    dwell_time INTEGER, -- Time spent viewing in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id, interaction_type)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_content_engagement_trending ON public.content_engagement_scores(trending_score DESC, last_calculated);
CREATE INDEX IF NOT EXISTS idx_content_engagement_post ON public.content_engagement_scores(post_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON public.user_content_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_post ON public.user_content_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_preferences_user ON public.user_feed_preferences(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- User feed preferences - users can only see/modify their own
ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed preferences" ON public.user_feed_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feed preferences" ON public.user_feed_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Content engagement scores - readable by all authenticated users
ALTER TABLE public.content_engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content engagement scores readable by authenticated users" ON public.content_engagement_scores
    FOR SELECT TO authenticated USING (true);

-- User interactions - users can only see their own interactions
ALTER TABLE public.user_content_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" ON public.user_content_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON public.user_content_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate trending score based on engagement metrics
CREATE OR REPLACE FUNCTION public.calculate_trending_score(
    p_likes INTEGER,
    p_comments INTEGER,
    p_shares INTEGER,
    p_created_at TIMESTAMP WITH TIME ZONE,
    p_author_trust_level TEXT DEFAULT 'unverified'
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_engagement_score FLOAT;
    v_time_decay FLOAT;
    v_trust_multiplier FLOAT;
    v_hours_old FLOAT;
BEGIN
    -- Calculate engagement score (weighted)
    v_engagement_score := (p_likes * 1.0) + (p_comments * 2.0) + (p_shares * 3.0);
    
    -- Calculate time decay (content gets less relevant over time)
    v_hours_old := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0;
    v_time_decay := EXP(-v_hours_old / 168.0); -- Half-life of 1 week
    
    -- Trust level multiplier
    v_trust_multiplier := CASE 
        WHEN p_author_trust_level = 'verified_alumni' THEN 1.2
        WHEN p_author_trust_level = 'school_verified' THEN 1.1
        ELSE 1.0
    END;
    
    -- Combine factors
    RETURN v_engagement_score * v_time_decay * v_trust_multiplier;
END;
$$;

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION public.calculate_quality_score(
    p_text_length INTEGER,
    p_has_media BOOLEAN,
    p_report_count INTEGER DEFAULT 0
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_length_score FLOAT;
    v_media_bonus FLOAT;
    v_safety_penalty FLOAT;
BEGIN
    -- Length score (optimal around 100-300 characters)
    v_length_score := CASE 
        WHEN p_text_length < 10 THEN 0.3
        WHEN p_text_length BETWEEN 10 AND 50 THEN 0.6
        WHEN p_text_length BETWEEN 50 AND 300 THEN 1.0
        WHEN p_text_length BETWEEN 300 AND 500 THEN 0.8
        ELSE 0.5
    END;
    
    -- Media bonus
    v_media_bonus := CASE WHEN p_has_media THEN 0.2 ELSE 0.0 END;
    
    -- Safety penalty for reported content
    v_safety_penalty := LEAST(p_report_count * 0.2, 0.8);
    
    RETURN GREATEST(v_length_score + v_media_bonus - v_safety_penalty, 0.1);
END;
$$;

-- Function to calculate user-specific relevance score
CREATE OR REPLACE FUNCTION public.calculate_relevance_score(
    p_user_id UUID,
    p_post_author_id UUID,
    p_post_school_id UUID,
    p_post_category TEXT DEFAULT 'general'
)
RETURNS FLOAT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_user_school_id UUID;
    v_school_match_bonus FLOAT := 0.0;
    v_connection_bonus FLOAT := 0.0;
    v_category_preference FLOAT := 0.5;
    v_preferences JSONB;
BEGIN
    -- Get user's school
    SELECT school_id INTO v_user_school_id
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- School affinity bonus
    IF v_user_school_id = p_post_school_id THEN
        v_school_match_bonus := 0.3;
    END IF;
    
    -- Connection bonus (if users are connected)
    IF EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE (user_id = p_user_id AND friend_id = p_post_author_id)
           OR (user_id = p_post_author_id AND friend_id = p_user_id)
        AND status = 'accepted'
    ) THEN
        v_connection_bonus := 0.4;
    END IF;
    
    -- Get user's category preferences
    SELECT category_weights INTO v_preferences
    FROM public.user_feed_preferences
    WHERE user_id = p_user_id;
    
    IF v_preferences IS NOT NULL THEN
        v_category_preference := COALESCE((v_preferences->>p_post_category)::FLOAT, 0.5);
    END IF;
    
    RETURN LEAST(v_school_match_bonus + v_connection_bonus + v_category_preference, 2.0);
END;
$$;

-- Function to update engagement scores (called periodically)
CREATE OR REPLACE FUNCTION public.update_content_engagement_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    post_record RECORD;
BEGIN
    -- Update scores for posts from the last 30 days
    FOR post_record IN 
        SELECT 
            p.id,
            p.text,
            p.media,
            p.created_at,
            p.author_id,
            p.school_id,
            prof.verification_status,
            COALESCE(r.like_count, 0) as likes,
            COALESCE(r.comment_count, 0) as comments,
            COALESCE(r.share_count, 0) as shares
        FROM public.posts p
        LEFT JOIN public.profiles prof ON p.author_id = prof.id
        LEFT JOIN (
            SELECT 
                post_id,
                COUNT(*) FILTER (WHERE type = 'like') as like_count,
                COUNT(*) FILTER (WHERE type = 'comment') as comment_count,
                COUNT(*) FILTER (WHERE type = 'share') as share_count
            FROM public.reactions
            GROUP BY post_id
        ) r ON p.id = r.post_id
        WHERE p.created_at > NOW() - INTERVAL '30 days'
    LOOP
        -- Calculate scores
        INSERT INTO public.content_engagement_scores (
            post_id,
            trending_score,
            quality_score,
            engagement_velocity,
            last_calculated
        ) VALUES (
            post_record.id,
            public.calculate_trending_score(
                post_record.likes,
                post_record.comments, 
                post_record.shares,
                post_record.created_at,
                COALESCE(post_record.verification_status, 'unverified')
            ),
            public.calculate_quality_score(
                COALESCE(LENGTH(post_record.text), 0),
                (post_record.media IS NOT NULL AND jsonb_array_length(post_record.media) > 0),
                0 -- TODO: Add report count
            ),
            -- Simple velocity calculation (engagement per hour)
            CASE 
                WHEN EXTRACT(EPOCH FROM (NOW() - post_record.created_at)) > 0 THEN
                    (post_record.likes + post_record.comments + post_record.shares)::FLOAT / 
                    (EXTRACT(EPOCH FROM (NOW() - post_record.created_at)) / 3600.0)
                ELSE 0.0
            END,
            NOW()
        )
        ON CONFLICT (post_id) DO UPDATE SET
            trending_score = EXCLUDED.trending_score,
            quality_score = EXCLUDED.quality_score,
            engagement_velocity = EXCLUDED.engagement_velocity,
            last_calculated = NOW();
            
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$;