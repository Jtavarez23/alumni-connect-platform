-- Advanced Feed RPC Functions
-- Implements get_for_you_feed and get_network_feed with sophisticated scoring
-- Part of Sprint 6: P2 Features for monetization-ready platform

-- =============================================
-- MAIN FEED RPC FUNCTIONS
-- =============================================

-- Get personalized "For You" feed with advanced scoring
CREATE OR REPLACE FUNCTION public.get_for_you_feed(
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    items JSONB,
    next_cursor TIMESTAMP WITH TIME ZONE,
    has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_school_id UUID;
    v_feed_preferences JSONB;
    v_items JSONB;
    v_count INTEGER;
    v_next_cursor TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get user's school and preferences
    SELECT school_id INTO v_user_school_id
    FROM public.profiles
    WHERE id = v_user_id;
    
    SELECT category_weights INTO v_feed_preferences
    FROM public.user_feed_preferences
    WHERE user_id = v_user_id;
    
    -- Build sophisticated feed query
    WITH scored_posts AS (
        SELECT 
            p.id,
            p.author_id,
            p.school_id,
            p.group_id,
            p.visibility,
            p.text,
            p.media,
            p.created_at,
            p.updated_at,
            -- Author info
            jsonb_build_object(
                'id', prof.id,
                'first_name', prof.first_name,
                'last_name', prof.last_name,
                'avatar_url', prof.avatar_url,
                'verification_status', prof.verification_status
            ) as author,
            -- Engagement metrics
            jsonb_build_object(
                'likes', COALESCE(r.like_count, 0),
                'comments', COALESCE(r.comment_count, 0),
                'shares', COALESCE(r.share_count, 0),
                'trending_score', COALESCE(ces.trending_score, 0.0)
            ) as metrics,
            -- Calculate personalized score
            (
                COALESCE(ces.trending_score, 0.0) * 0.4 +
                COALESCE(ces.quality_score, 0.5) * 0.3 +
                public.calculate_relevance_score(v_user_id, p.author_id, p.school_id, 'general') * 0.3
            ) as personalized_score,
            -- Trending reason
            CASE 
                WHEN COALESCE(ces.trending_score, 0) > 5.0 THEN 'Trending in your network'
                WHEN p.school_id = v_user_school_id THEN 'Popular at your school'
                WHEN EXISTS (
                    SELECT 1 FROM public.friendships f 
                    WHERE (f.user_id = v_user_id AND f.friend_id = p.author_id)
                       OR (f.user_id = p.author_id AND f.friend_id = v_user_id)
                    AND f.status = 'accepted'
                ) THEN 'From your network'
                WHEN COALESCE(ces.engagement_velocity, 0) > 1.0 THEN 'Getting lots of engagement'
                ELSE 'Recommended for you'
            END as trending_reason
        FROM public.posts p
        LEFT JOIN public.profiles prof ON p.author_id = prof.id
        LEFT JOIN public.content_engagement_scores ces ON p.id = ces.post_id
        LEFT JOIN (
            SELECT 
                post_id,
                COUNT(*) FILTER (WHERE type = 'like') as like_count,
                COUNT(*) FILTER (WHERE type = 'comment') as comment_count,
                COUNT(*) FILTER (WHERE type = 'share') as share_count
            FROM public.reactions
            GROUP BY post_id
        ) r ON p.id = r.post_id
        WHERE 
            -- Visibility checks
            (p.visibility = 'public' OR p.visibility = 'alumni_only')
            -- Cursor pagination
            AND (p_cursor IS NULL OR p.created_at < p_cursor)
            -- Exclude user's own posts from For You feed
            AND p.author_id != v_user_id
            -- Exclude hidden/blocked content
            AND NOT EXISTS (
                SELECT 1 FROM public.user_content_interactions uci
                WHERE uci.user_id = v_user_id 
                AND uci.post_id = p.id 
                AND uci.interaction_type = 'hide'
            )
    ),
    ranked_posts AS (
        SELECT *
        FROM scored_posts
        ORDER BY personalized_score DESC, created_at DESC
        LIMIT p_limit + 1
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', rp.id,
                'author_id', rp.author_id,
                'school_id', rp.school_id,
                'group_id', rp.group_id,
                'visibility', rp.visibility,
                'content', jsonb_build_object(
                    'text', rp.text,
                    'media', rp.media
                ),
                'metrics', rp.metrics,
                'created_at', rp.created_at,
                'updated_at', rp.updated_at,
                'author', rp.author,
                'trending_reason', rp.trending_reason,
                'personalized_score', rp.personalized_score
            )
            ORDER BY personalized_score DESC, created_at DESC
        ) as feed_items,
        COUNT(*) as item_count
    INTO v_items, v_count
    FROM ranked_posts rp;
    
    -- Determine next cursor
    IF v_count > p_limit THEN
        -- Remove the extra item and get cursor from last real item
        SELECT (jsonb_array_elements(v_items)->>'created_at')::TIMESTAMP WITH TIME ZONE
        INTO v_next_cursor
        FROM (SELECT v_items LIMIT 1) t
        ORDER BY (jsonb_array_elements(v_items)->>'created_at')::TIMESTAMP WITH TIME ZONE
        OFFSET p_limit - 1 LIMIT 1;
        
        -- Trim array to requested size
        v_items := (
            SELECT jsonb_agg(item) 
            FROM jsonb_array_elements(v_items) WITH ORDINALITY AS item(item, pos)
            WHERE pos <= p_limit
        );
        v_count := p_limit;
    END IF;
    
    RETURN QUERY SELECT v_items, v_next_cursor, (v_count > p_limit);
END;
$$;

-- Get network feed (posts from connections and same school)
CREATE OR REPLACE FUNCTION public.get_network_feed(
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    items JSONB,
    next_cursor TIMESTAMP WITH TIME ZONE,
    has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_school_id UUID;
    v_items JSONB;
    v_count INTEGER;
    v_next_cursor TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get user's school
    SELECT school_id INTO v_user_school_id
    FROM public.profiles
    WHERE id = v_user_id;
    
    -- Build network feed query
    WITH network_posts AS (
        SELECT 
            p.id,
            p.author_id,
            p.school_id,
            p.group_id,
            p.visibility,
            p.text,
            p.media,
            p.created_at,
            p.updated_at,
            -- Author info
            jsonb_build_object(
                'id', prof.id,
                'first_name', prof.first_name,
                'last_name', prof.last_name,
                'avatar_url', prof.avatar_url,
                'verification_status', prof.verification_status
            ) as author,
            -- Engagement metrics
            jsonb_build_object(
                'likes', COALESCE(r.like_count, 0),
                'comments', COALESCE(r.comment_count, 0),
                'shares', COALESCE(r.share_count, 0)
            ) as metrics
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
        WHERE 
            -- Visibility checks
            (p.visibility = 'public' OR p.visibility = 'alumni_only')
            -- Cursor pagination
            AND (p_cursor IS NULL OR p.created_at < p_cursor)
            -- Network criteria: friends or same school
            AND (
                p.author_id = v_user_id -- User's own posts
                OR p.school_id = v_user_school_id -- Same school
                OR EXISTS ( -- Connected users
                    SELECT 1 FROM public.friendships f
                    WHERE (f.user_id = v_user_id AND f.friend_id = p.author_id)
                       OR (f.user_id = p.author_id AND f.friend_id = v_user_id)
                    AND f.status = 'accepted'
                )
            )
        ORDER BY p.created_at DESC
        LIMIT p_limit + 1
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', np.id,
                'author_id', np.author_id,
                'school_id', np.school_id,
                'group_id', np.group_id,
                'visibility', np.visibility,
                'content', jsonb_build_object(
                    'text', np.text,
                    'media', np.media
                ),
                'metrics', np.metrics,
                'created_at', np.created_at,
                'updated_at', np.updated_at,
                'author', np.author
            )
            ORDER BY created_at DESC
        ) as feed_items,
        COUNT(*) as item_count
    INTO v_items, v_count
    FROM network_posts np;
    
    -- Determine next cursor and has_more
    IF v_count > p_limit THEN
        -- Get cursor from last real item
        SELECT (jsonb_array_elements(v_items)->>'created_at')::TIMESTAMP WITH TIME ZONE
        INTO v_next_cursor
        FROM (SELECT v_items LIMIT 1) t
        ORDER BY (jsonb_array_elements(v_items)->>'created_at')::TIMESTAMP WITH TIME ZONE
        OFFSET p_limit - 1 LIMIT 1;
        
        -- Trim array to requested size
        v_items := (
            SELECT jsonb_agg(item) 
            FROM jsonb_array_elements(v_items) WITH ORDINALITY AS item(item, pos)
            WHERE pos <= p_limit
        );
        v_count := p_limit;
    END IF;
    
    RETURN QUERY SELECT v_items, v_next_cursor, (v_count > p_limit);
END;
$$;

-- Function to record user content interactions for learning
CREATE OR REPLACE FUNCTION public.record_content_interaction(
    p_post_id UUID,
    p_interaction_type TEXT,
    p_dwell_time INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_weight FLOAT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Assign interaction weights
    v_weight := CASE p_interaction_type
        WHEN 'view' THEN 0.1
        WHEN 'like' THEN 1.0
        WHEN 'comment' THEN 2.0
        WHEN 'share' THEN 3.0
        WHEN 'hide' THEN -5.0
        WHEN 'report' THEN -10.0
        ELSE 1.0
    END;
    
    INSERT INTO public.user_content_interactions (
        user_id,
        post_id,
        interaction_type,
        interaction_weight,
        dwell_time
    ) VALUES (
        v_user_id,
        p_post_id,
        p_interaction_type,
        v_weight,
        p_dwell_time
    )
    ON CONFLICT (user_id, post_id, interaction_type) DO UPDATE SET
        interaction_weight = EXCLUDED.interaction_weight,
        dwell_time = EXCLUDED.dwell_time,
        created_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to get or create user feed preferences
CREATE OR REPLACE FUNCTION public.get_user_feed_preferences()
RETURNS TABLE (
    category_weights JSONB,
    school_affinity FLOAT,
    recency_preference FLOAT,
    engagement_threshold FLOAT
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
    
    -- Create default preferences if they don't exist
    INSERT INTO public.user_feed_preferences (
        user_id,
        category_weights,
        school_affinity,
        recency_preference,
        engagement_threshold
    ) VALUES (
        v_user_id,
        '{"general": 0.5, "memories": 0.8, "achievements": 0.7, "events": 0.6, "business": 0.4}',
        1.0,
        0.7,
        0.1
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Return preferences
    RETURN QUERY
    SELECT 
        ufp.category_weights,
        ufp.school_affinity,
        ufp.recency_preference,
        ufp.engagement_threshold
    FROM public.user_feed_preferences ufp
    WHERE ufp.user_id = v_user_id;
END;
$$;

-- Function to update user feed preferences
CREATE OR REPLACE FUNCTION public.update_user_feed_preferences(
    p_category_weights JSONB DEFAULT NULL,
    p_school_affinity FLOAT DEFAULT NULL,
    p_recency_preference FLOAT DEFAULT NULL,
    p_engagement_threshold FLOAT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO public.user_feed_preferences (
        user_id,
        category_weights,
        school_affinity,
        recency_preference,
        engagement_threshold
    ) VALUES (
        v_user_id,
        COALESCE(p_category_weights, '{"general": 0.5}'),
        COALESCE(p_school_affinity, 1.0),
        COALESCE(p_recency_preference, 0.7),
        COALESCE(p_engagement_threshold, 0.1)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        category_weights = COALESCE(p_category_weights, user_feed_preferences.category_weights),
        school_affinity = COALESCE(p_school_affinity, user_feed_preferences.school_affinity),
        recency_preference = COALESCE(p_recency_preference, user_feed_preferences.recency_preference),
        engagement_threshold = COALESCE(p_engagement_threshold, user_feed_preferences.engagement_threshold),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;