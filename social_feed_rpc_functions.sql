-- ===========================================
-- SOCIAL FEED RPC FUNCTIONS
-- Complete backend functionality for Alumni Connect social feed
-- ===========================================

-- Helper function to get reaction counts for posts
CREATE OR REPLACE FUNCTION get_post_metrics(post_id UUID)
RETURNS JSON AS $$
DECLARE
  like_count INTEGER;
  comment_count INTEGER;
  share_count INTEGER;
BEGIN
  -- Count reactions (likes)
  SELECT COUNT(*) INTO like_count 
  FROM reactions 
  WHERE post_id = get_post_metrics.post_id AND reaction_type = 'like';
  
  -- Count comments
  SELECT COUNT(*) INTO comment_count 
  FROM comments 
  WHERE post_id = get_post_metrics.post_id;
  
  -- Share count (for now, assume 0 - would track in separate table)
  share_count := 0;
  
  RETURN json_build_object(
    'likes', like_count,
    'comments', comment_count,
    'shares', share_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new post
CREATE OR REPLACE FUNCTION create_post(
  p_text TEXT DEFAULT NULL,
  p_media_urls TEXT[] DEFAULT NULL,
  p_visibility TEXT DEFAULT 'school',
  p_school_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_post_id UUID;
  user_school_id UUID;
  result JSON;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Validate content
  IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
    IF p_media_urls IS NULL OR array_length(p_media_urls, 1) = 0 THEN
      RETURN json_build_object('error', 'Post must have text or media');
    END IF;
  END IF;
  
  -- Get user's school if not provided
  IF p_school_id IS NULL THEN
    SELECT school_id INTO user_school_id 
    FROM profiles 
    WHERE id = auth.uid();
  ELSE
    user_school_id := p_school_id;
  END IF;
  
  -- Insert new post
  INSERT INTO posts (
    user_id, 
    content, 
    media_urls, 
    visibility, 
    school_id, 
    post_type
  ) VALUES (
    auth.uid(), 
    p_text, 
    COALESCE(p_media_urls::JSONB, '[]'::JSONB), 
    p_visibility, 
    user_school_id,
    CASE 
      WHEN p_media_urls IS NOT NULL AND array_length(p_media_urls, 1) > 0 THEN 'photo'
      ELSE 'text'
    END
  ) 
  RETURNING id INTO new_post_id;
  
  -- Return success with post ID
  RETURN json_build_object(
    'success', true,
    'post_id', new_post_id,
    'message', 'Post created successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', 'Failed to create post: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle post likes
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS JSON AS $$
DECLARE
  existing_like_id UUID;
  action_taken TEXT;
  new_like_count INTEGER;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check if user already liked this post
  SELECT id INTO existing_like_id 
  FROM reactions 
  WHERE post_id = p_post_id 
    AND user_id = auth.uid() 
    AND reaction_type = 'like';
  
  IF existing_like_id IS NOT NULL THEN
    -- Unlike: Remove existing like
    DELETE FROM reactions WHERE id = existing_like_id;
    action_taken := 'unliked';
  ELSE
    -- Like: Add new like
    INSERT INTO reactions (post_id, user_id, reaction_type) 
    VALUES (p_post_id, auth.uid(), 'like');
    action_taken := 'liked';
  END IF;
  
  -- Get updated like count
  SELECT COUNT(*) INTO new_like_count 
  FROM reactions 
  WHERE post_id = p_post_id AND reaction_type = 'like';
  
  RETURN json_build_object(
    'success', true,
    'action', action_taken,
    'like_count', new_like_count
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', 'Failed to toggle like: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get network feed (connections/friends posts)
CREATE OR REPLACE FUNCTION get_network_feed(
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
  feed_items JSON;
  next_cursor TEXT;
  cursor_timestamp TIMESTAMPTZ;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Parse cursor if provided
  IF p_cursor IS NOT NULL THEN
    cursor_timestamp := p_cursor::TIMESTAMPTZ;
  ELSE
    cursor_timestamp := NOW();
  END IF;
  
  -- Build feed query for network posts
  WITH network_posts AS (
    SELECT 
      p.id,
      p.user_id as author_id,
      p.content as text,
      p.media_urls,
      p.visibility,
      p.created_at,
      prof.first_name || ' ' || COALESCE(prof.last_name, '') as author_name,
      prof.avatar_url,
      s.name as school_name,
      prof.graduation_year,
      CASE 
        WHEN prof.verification_status = 'verified' THEN 'verified_alumni'
        ELSE 'unverified'
      END as trust_level
    FROM posts p
    JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN schools s ON prof.school_id = s.id
    WHERE p.created_at < cursor_timestamp
      AND p.visibility IN ('public', 'school')
      AND (
        -- Public posts
        p.visibility = 'public'
        OR 
        -- School posts from user's school
        (p.visibility = 'school' AND p.school_id IN (
          SELECT school_id FROM profiles WHERE id = auth.uid()
        ))
        OR
        -- User's own posts
        p.user_id = auth.uid()
      )
    ORDER BY p.created_at DESC
    LIMIT p_limit + 1
  )
  SELECT json_build_object(
    'items', COALESCE(json_agg(
      json_build_object(
        'id', np.id,
        'author', json_build_object(
          'id', np.author_id,
          'name', np.author_name,
          'avatar_url', np.avatar_url,
          'school', np.school_name,
          'graduation_year', np.graduation_year,
          'trust_level', np.trust_level
        ),
        'content', json_build_object(
          'text', np.text,
          'media', CASE 
            WHEN np.media_urls IS NOT NULL THEN np.media_urls
            ELSE '[]'::JSON
          END
        ),
        'metrics', get_post_metrics(np.id),
        'created_at', np.created_at,
        'visibility', np.visibility
      ) ORDER BY np.created_at DESC
    ) FILTER (WHERE np.id IS NOT NULL), '[]'::JSON),
    'next_cursor', CASE 
      WHEN COUNT(*) > p_limit THEN 
        (SELECT created_at FROM network_posts ORDER BY created_at DESC LIMIT 1 OFFSET p_limit)::TEXT
      ELSE NULL
    END
  ) INTO feed_items
  FROM network_posts;
  
  RETURN COALESCE(feed_items, json_build_object('items', '[]'::JSON, 'next_cursor', NULL));
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', 'Failed to fetch network feed: ' || SQLERRM,
    'items', '[]'::JSON
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get "For You" feed (trending/algorithmic posts)
CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
  feed_items JSON;
  next_cursor TEXT;
  cursor_timestamp TIMESTAMPTZ;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Parse cursor if provided
  IF p_cursor IS NOT NULL THEN
    cursor_timestamp := p_cursor::TIMESTAMPTZ;
  ELSE
    cursor_timestamp := NOW();
  END IF;
  
  -- Build trending feed with engagement scoring
  WITH trending_posts AS (
    SELECT 
      p.id,
      p.user_id as author_id,
      p.content as text,
      p.media_urls,
      p.visibility,
      p.created_at,
      prof.first_name || ' ' || COALESCE(prof.last_name, '') as author_name,
      prof.avatar_url,
      s.name as school_name,
      prof.graduation_year,
      CASE 
        WHEN prof.verification_status = 'verified' THEN 'verified_alumni'
        ELSE 'unverified'
      END as trust_level,
      -- Simple engagement score: likes + comments * 2, weighted by recency
      COALESCE(
        (
          COALESCE((SELECT COUNT(*) FROM reactions WHERE post_id = p.id AND reaction_type = 'like'), 0) +
          COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = p.id), 0) * 2
        ) * EXP(-EXTRACT(epoch FROM (NOW() - p.created_at)) / 86400.0), -- Decay over time
        0
      ) as trending_score
    FROM posts p
    JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN schools s ON prof.school_id = s.id
    WHERE p.created_at < cursor_timestamp
      AND p.created_at > NOW() - INTERVAL '30 days' -- Only recent posts for trending
      AND p.visibility IN ('public', 'school')
      AND (
        p.visibility = 'public'
        OR 
        (p.visibility = 'school' AND p.school_id IN (
          SELECT school_id FROM profiles WHERE id = auth.uid()
        ))
        OR
        p.user_id = auth.uid()
      )
    ORDER BY trending_score DESC, p.created_at DESC
    LIMIT p_limit + 1
  )
  SELECT json_build_object(
    'items', COALESCE(json_agg(
      json_build_object(
        'id', tp.id,
        'author', json_build_object(
          'id', tp.author_id,
          'name', tp.author_name,
          'avatar_url', tp.avatar_url,
          'school', tp.school_name,
          'graduation_year', tp.graduation_year,
          'trust_level', tp.trust_level
        ),
        'content', json_build_object(
          'text', tp.text,
          'media', CASE 
            WHEN tp.media_urls IS NOT NULL THEN tp.media_urls
            ELSE '[]'::JSON
          END
        ),
        'metrics', json_build_object(
          'likes', (get_post_metrics(tp.id)->>'likes')::INTEGER,
          'comments', (get_post_metrics(tp.id)->>'comments')::INTEGER,
          'shares', 0,
          'trending_score', ROUND(tp.trending_score::NUMERIC, 2)
        ),
        'created_at', tp.created_at,
        'visibility', tp.visibility,
        'trending_reason', CASE 
          WHEN tp.trending_score > 10 THEN 'High engagement'
          WHEN tp.trending_score > 5 THEN 'Popular post'
          ELSE 'Recent activity'
        END
      ) ORDER BY tp.trending_score DESC, tp.created_at DESC
    ) FILTER (WHERE tp.id IS NOT NULL), '[]'::JSON),
    'next_cursor', CASE 
      WHEN COUNT(*) > p_limit THEN 
        (SELECT created_at FROM trending_posts ORDER BY trending_score DESC, created_at DESC LIMIT 1 OFFSET p_limit)::TEXT
      ELSE NULL
    END
  ) INTO feed_items
  FROM trending_posts;
  
  RETURN COALESCE(feed_items, json_build_object('items', '[]'::JSON, 'next_cursor', NULL));
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', 'Failed to fetch for you feed: ' || SQLERRM,
    'items', '[]'::JSON
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;