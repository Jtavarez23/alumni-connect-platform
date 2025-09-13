-- Alumni Connect - Comment RPC Functions
-- Implements AC-ARCH-004 comment system requirements

-- Function to create a comment
CREATE OR REPLACE FUNCTION create_comment(
  p_post_id UUID,
  p_text TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_id UUID;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Validate text content
  IF p_text IS NULL OR TRIM(p_text) = '' THEN
    RETURN json_build_object('error', 'Comment text cannot be empty');
  END IF;

  -- Validate post exists
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id) THEN
    RETURN json_build_object('error', 'Post not found');
  END IF;

  -- Insert comment
  INSERT INTO comments (post_id, author_id, text)
  VALUES (p_post_id, v_user_id, TRIM(p_text))
  RETURNING id INTO v_comment_id;

  -- Update post metrics
  UPDATE post_metrics 
  SET comment_count = comment_count + 1 
  WHERE post_id = p_post_id;

  RETURN json_build_object(
    'success', true,
    'comment_id', v_comment_id,
    'message', 'Comment created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comments for a post
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  v_comments JSON[] := '{}';
  v_comment RECORD;
  v_total_count INTEGER;
BEGIN
  -- Get total comment count
  SELECT COUNT(*) INTO v_total_count
  FROM comments 
  WHERE post_id = p_post_id;

  -- Get paginated comments with author info
  FOR v_comment IN
    SELECT 
      c.id,
      c.text,
      c.created_at,
      c.author_id,
      p.first_name || ' ' || p.last_name as author_name,
      p.avatar_url as author_avatar,
      p.trust_level
    FROM comments c
    LEFT JOIN profiles p ON c.author_id = p.id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC
    LIMIT p_limit
    OFFSET p_offset
  LOOP
    v_comments := v_comments || json_build_object(
      'id', v_comment.id,
      'text', v_comment.text,
      'created_at', v_comment.created_at,
      'author', json_build_object(
        'id', v_comment.author_id,
        'name', v_comment.author_name,
        'avatar_url', v_comment.author_avatar,
        'trust_level', v_comment.trust_level
      )
    );
  END LOOP;

  RETURN json_build_object(
    'comments', v_comments,
    'total_count', v_total_count,
    'has_more', (p_offset + p_limit) < v_total_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a comment
CREATE OR REPLACE FUNCTION delete_comment(
  p_comment_id UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_id UUID;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Get post ID for metrics update
  SELECT post_id INTO v_post_id 
  FROM comments 
  WHERE id = p_comment_id;

  -- Delete comment (only if user is author or has admin rights)
  DELETE FROM comments 
  WHERE id = p_comment_id 
  AND (author_id = v_user_id OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_user_id AND trust_level = 'admin'
  ));

  -- Update post metrics if comment was deleted
  IF FOUND THEN
    UPDATE post_metrics 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE post_id = v_post_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Comment deleted successfully'
    );
  ELSE
    RETURN json_build_object('error', 'Comment not found or unauthorized');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;