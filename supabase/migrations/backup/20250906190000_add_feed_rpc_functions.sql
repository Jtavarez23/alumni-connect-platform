-- Alumni Connect - Feed RPC Functions
-- Implements AC-ARCH-002b and AC-ARCH-004 feed system requirements

-- Function to get network feed (people you know)
CREATE OR REPLACE FUNCTION get_network_feed(
  p_user_id UUID DEFAULT auth.uid(),
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_posts RECORD;
  v_feed_items JSON[] := '{}';
  v_next_cursor TEXT := NULL;
BEGIN
  -- Validate user is authenticated
  IF p_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Get posts from user's network (friends/connections)
  FOR v_posts IN
    SELECT 
      p.id,
      p.author_id,
      p.text,
      p.media_urls,
      p.visibility,
      p.created_at,
      pr.first_name || ' ' || pr.last_name as author_name,
      pr.avatar_url as author_avatar,
      s.name as school_name,
      EXTRACT(YEAR FROM ue.graduation_date) as graduation_year,
      pr.trust_level,
      COALESCE(pm.like_count, 0) as likes,
      COALESCE(pm.comment_count, 0) as comments,
      COALESCE(pm.share_count, 0) as shares
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    LEFT JOIN user_education ue ON pr.id = ue.user_id
    LEFT JOIN schools s ON ue.school_id = s.id
    LEFT JOIN post_metrics pm ON p.id = pm.post_id
    WHERE p.author_id IN (
      -- Get user's connections
      SELECT 
        CASE 
          WHEN c.requester_id = p_user_id THEN c.addressee_id
          ELSE c.requester_id
        END as friend_id
      FROM connections c 
      WHERE (c.requester_id = p_user_id OR c.addressee_id = p_user_id)
        AND c.status = 'accepted'
    )
    AND (p.visibility IN ('public', 'alumni_only') OR 
         (p.visibility = 'connections_only' AND EXISTS (
           SELECT 1 FROM connections c2 
           WHERE ((c2.requester_id = p_user_id AND c2.addressee_id = p.author_id) OR
                  (c2.requester_id = p.author_id AND c2.addressee_id = p_user_id))
             AND c2.status = 'accepted'
         )))
    AND (p_cursor IS NULL OR p.created_at < p_cursor::timestamptz)
    ORDER BY p.created_at DESC
    LIMIT p_limit + 1
  LOOP
    IF array_length(v_feed_items, 1) < p_limit THEN
      v_feed_items := v_feed_items || json_build_object(
        'id', v_posts.id,
        'author', json_build_object(
          'id', v_posts.author_id,
          'name', v_posts.author_name,
          'avatar_url', v_posts.author_avatar,
          'school', v_posts.school_name,
          'graduation_year', v_posts.graduation_year,
          'trust_level', v_posts.trust_level
        ),
        'content', json_build_object(
          'text', v_posts.text,
          'media', v_posts.media_urls
        ),
        'metrics', json_build_object(
          'likes', v_posts.likes,
          'comments', v_posts.comments,
          'shares', v_posts.shares
        ),
        'created_at', v_posts.created_at,
        'visibility', v_posts.visibility
      );
    ELSE
      v_next_cursor := v_posts.created_at::TEXT;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'items', v_feed_items,
    'next_cursor', v_next_cursor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get "For You" feed (trending/viral content)
CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_user_id UUID DEFAULT auth.uid(),
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_posts RECORD;
  v_feed_items JSON[] := '{}';
  v_next_cursor TEXT := NULL;
  v_user_school_ids UUID[];
BEGIN
  -- Validate user is authenticated
  IF p_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Get user's school IDs for relevance scoring
  SELECT array_agg(school_id) INTO v_user_school_ids
  FROM user_education 
  WHERE user_id = p_user_id;

  -- Get trending posts with algorithmic scoring
  FOR v_posts IN
    SELECT 
      p.id,
      p.author_id,
      p.text,
      p.media_urls,
      p.visibility,
      p.created_at,
      pr.first_name || ' ' || pr.last_name as author_name,
      pr.avatar_url as author_avatar,
      s.name as school_name,
      EXTRACT(YEAR FROM ue.graduation_date) as graduation_year,
      pr.trust_level,
      COALESCE(pm.like_count, 0) as likes,
      COALESCE(pm.comment_count, 0) as comments,
      COALESCE(pm.share_count, 0) as shares,
      -- Trending score algorithm
      (COALESCE(pm.like_count, 0) * 1.0 + 
       COALESCE(pm.comment_count, 0) * 2.0 + 
       COALESCE(pm.share_count, 0) * 3.0 +
       CASE WHEN ue.school_id = ANY(v_user_school_ids) THEN 5.0 ELSE 0.0 END +
       CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 10.0 ELSE 0.0 END
      ) / EXTRACT(EPOCH FROM (NOW() - p.created_at + INTERVAL '1 hour')) * 3600 as trending_score
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    LEFT JOIN user_education ue ON pr.id = ue.user_id
    LEFT JOIN schools s ON ue.school_id = s.id
    LEFT JOIN post_metrics pm ON p.id = pm.post_id
    WHERE p.visibility IN ('public', 'alumni_only')
      AND p.created_at > NOW() - INTERVAL '7 days' -- Only recent posts
      AND (p_cursor IS NULL OR p.created_at < p_cursor::timestamptz)
    ORDER BY trending_score DESC, p.created_at DESC
    LIMIT p_limit + 1
  LOOP
    IF array_length(v_feed_items, 1) < p_limit THEN
      v_feed_items := v_feed_items || json_build_object(
        'id', v_posts.id,
        'author', json_build_object(
          'id', v_posts.author_id,
          'name', v_posts.author_name,
          'avatar_url', v_posts.author_avatar,
          'school', v_posts.school_name,
          'graduation_year', v_posts.graduation_year,
          'trust_level', v_posts.trust_level
        ),
        'content', json_build_object(
          'text', v_posts.text,
          'media', v_posts.media_urls
        ),
        'metrics', json_build_object(
          'likes', v_posts.likes,
          'comments', v_posts.comments,
          'shares', v_posts.shares,
          'trending_score', v_posts.trending_score
        ),
        'created_at', v_posts.created_at,
        'visibility', v_posts.visibility,
        'trending_reason', 
          CASE 
            WHEN v_posts.school_name IS NOT NULL THEN 'Popular in ' || v_posts.school_name
            ELSE 'Trending across alumni networks'
          END
      );
    ELSE
      v_next_cursor := v_posts.created_at::TEXT;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'items', v_feed_items,
    'next_cursor', v_next_cursor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new post
CREATE OR REPLACE FUNCTION create_post(
  p_text TEXT DEFAULT NULL,
  p_media_urls TEXT[] DEFAULT NULL,
  p_visibility visibility DEFAULT 'alumni_only',
  p_school_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_id UUID;
  v_result JSON;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Validate content exists
  IF p_text IS NULL AND (p_media_urls IS NULL OR array_length(p_media_urls, 1) = 0) THEN
    RETURN json_build_object('error', 'Post must have text or media content');
  END IF;

  -- Insert new post
  INSERT INTO posts (
    author_id,
    text,
    media_urls,
    visibility,
    school_id,
    group_id
  ) VALUES (
    v_user_id,
    p_text,
    p_media_urls,
    p_visibility,
    p_school_id,
    p_group_id
  )
  RETURNING id INTO v_post_id;

  -- Initialize post metrics
  INSERT INTO post_metrics (post_id, like_count, comment_count, share_count)
  VALUES (v_post_id, 0, 0, 0);

  RETURN json_build_object(
    'success', true,
    'post_id', v_post_id,
    'message', 'Post created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle post like
CREATE OR REPLACE FUNCTION toggle_post_like(
  p_post_id UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Check if user has already liked this post
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_liked;

  IF v_liked THEN
    -- Unlike the post
    DELETE FROM post_likes 
    WHERE post_id = p_post_id AND user_id = v_user_id;
    
    -- Update metrics
    UPDATE post_metrics 
    SET like_count = like_count - 1 
    WHERE post_id = p_post_id
    RETURNING like_count INTO v_new_count;
  ELSE
    -- Like the post
    INSERT INTO post_likes (post_id, user_id) 
    VALUES (p_post_id, v_user_id);
    
    -- Update metrics
    UPDATE post_metrics 
    SET like_count = like_count + 1 
    WHERE post_id = p_post_id
    RETURNING like_count INTO v_new_count;
  END IF;

  RETURN json_build_object(
    'success', true,
    'liked', NOT v_liked,
    'like_count', COALESCE(v_new_count, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;