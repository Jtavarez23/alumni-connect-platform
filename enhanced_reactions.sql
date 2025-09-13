-- Enhanced reaction system with multiple reaction types
-- Update the toggle_post_like function to handle all reaction types

CREATE OR REPLACE FUNCTION toggle_post_reaction(
  p_post_id UUID,
  p_reaction_type TEXT DEFAULT 'like'
)
RETURNS JSON AS $$
DECLARE
  existing_reaction_id UUID;
  existing_reaction_type TEXT;
  action_taken TEXT;
  reaction_counts JSON;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Validate reaction type
  IF p_reaction_type NOT IN ('like', 'love', 'wow', 'laugh', 'sad', 'angry') THEN
    RETURN json_build_object('error', 'Invalid reaction type');
  END IF;
  
  -- Check if user already reacted to this post
  SELECT id, reaction_type INTO existing_reaction_id, existing_reaction_type
  FROM reactions 
  WHERE post_id = p_post_id 
    AND user_id = auth.uid();
  
  IF existing_reaction_id IS NOT NULL THEN
    IF existing_reaction_type = p_reaction_type THEN
      -- Remove existing reaction (toggle off)
      DELETE FROM reactions WHERE id = existing_reaction_id;
      action_taken := 'removed';
    ELSE
      -- Update existing reaction to new type
      UPDATE reactions 
      SET reaction_type = p_reaction_type, created_at = NOW()
      WHERE id = existing_reaction_id;
      action_taken := 'updated';
    END IF;
  ELSE
    -- Add new reaction
    INSERT INTO reactions (post_id, user_id, reaction_type) 
    VALUES (p_post_id, auth.uid(), p_reaction_type);
    action_taken := 'added';
  END IF;
  
  -- Get updated reaction counts
  SELECT json_object_agg(reaction_type, reaction_count) INTO reaction_counts
  FROM (
    SELECT 
      reaction_type, 
      COUNT(*) as reaction_count
    FROM reactions 
    WHERE post_id = p_post_id 
    GROUP BY reaction_type
  ) reaction_summary;
  
  RETURN json_build_object(
    'success', true,
    'action', action_taken,
    'reaction_type', p_reaction_type,
    'reactions', COALESCE(reaction_counts, '{}'::JSON),
    'user_reaction', CASE 
      WHEN action_taken = 'removed' THEN NULL
      ELSE p_reaction_type
    END
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', 'Failed to toggle reaction: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated helper function to get detailed reaction metrics
CREATE OR REPLACE FUNCTION get_post_metrics(post_id UUID)
RETURNS JSON AS $$
DECLARE
  comment_count INTEGER;
  share_count INTEGER;
  reaction_counts JSON;
  total_reactions INTEGER;
BEGIN
  -- Count comments
  SELECT COUNT(*) INTO comment_count 
  FROM comments 
  WHERE post_id = get_post_metrics.post_id;
  
  -- Share count (for now, assume 0 - would track in separate table)
  share_count := 0;
  
  -- Get detailed reaction counts
  SELECT 
    json_object_agg(reaction_type, reaction_count),
    SUM(reaction_count)
  INTO reaction_counts, total_reactions
  FROM (
    SELECT 
      reaction_type, 
      COUNT(*) as reaction_count
    FROM reactions 
    WHERE post_id = get_post_metrics.post_id 
    GROUP BY reaction_type
  ) reaction_summary;
  
  RETURN json_build_object(
    'likes', COALESCE((reaction_counts->>'like')::INTEGER, 0),
    'comments', comment_count,
    'shares', share_count,
    'total_reactions', COALESCE(total_reactions, 0),
    'reactions', COALESCE(reaction_counts, '{}'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's reaction to a specific post
CREATE OR REPLACE FUNCTION get_user_post_reaction(p_post_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_reaction TEXT;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT reaction_type INTO user_reaction
  FROM reactions 
  WHERE post_id = p_post_id 
    AND user_id = auth.uid();
  
  RETURN user_reaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;