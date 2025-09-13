-- Additional RPC functions for V2 subscription system

-- Function to increment search usage
CREATE OR REPLACE FUNCTION increment_search_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_quotas (user_id, date, searches_used, search_limit, earned_searches)
  VALUES (
    p_user_id, 
    CURRENT_DATE, 
    1, 
    CASE 
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND subscription_tier = 'premium')
      THEN 999999 
      ELSE 3 
    END,
    0
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    searches_used = search_quotas.searches_used + 1,
    last_search_at = now();
END;
$$;

-- Function to check if user can create group chats
CREATE OR REPLACE FUNCTION can_create_group_chat(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Premium users can create unlimited groups
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND subscription_tier IN ('premium', 'enterprise'))
    THEN true
    ELSE (
      -- Free users can only create 1 group per school/year
      SELECT COUNT(*) < 1
      FROM group_chats gc
      WHERE gc.created_by = p_user_id
    )
  END;
$$;

-- Function to get user's premium features
CREATE OR REPLACE FUNCTION get_user_premium_features(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN p.subscription_tier = 'enterprise' THEN
      '["unlimited_schools", "unlimited_searches", "unlimited_messaging", "profile_analytics", "all_years_networking", "verified_social_links", "unlimited_suggestions", "export_contacts", "event_creation", "premium_badge", "bulk_yearbook_upload", "analytics_dashboard", "custom_branding", "api_access"]'::jsonb
    WHEN p.subscription_tier = 'premium' THEN
      '["unlimited_schools", "unlimited_searches", "unlimited_messaging", "profile_analytics", "all_years_networking", "verified_social_links", "unlimited_suggestions", "export_contacts", "event_creation", "premium_badge"]'::jsonb
    ELSE
      '[]'::jsonb
  END
  FROM profiles p
  WHERE p.id = p_user_id;
$$;

-- Function to get profile analytics for premium users
CREATE OR REPLACE FUNCTION get_profile_analytics(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_user_id 
      AND subscription_tier IN ('premium', 'enterprise')
    ) THEN
      json_build_object(
        'total_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id
        ), 0),
        'this_week_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id 
          AND viewed_at > now() - interval '7 days'
        ), 0),
        'this_month_views', COALESCE((
          SELECT COUNT(*) 
          FROM profile_views 
          WHERE viewed_id = p_user_id 
          AND viewed_at > now() - interval '30 days'
        ), 0),
        'unique_viewers', COALESCE((
          SELECT COUNT(DISTINCT viewer_id) 
          FROM profile_views 
          WHERE viewed_id = p_user_id
        ), 0),
        'top_contexts', (
          SELECT json_agg(context_stats)
          FROM (
            SELECT 
              view_context,
              COUNT(*) as count
            FROM profile_views 
            WHERE viewed_id = p_user_id
            GROUP BY view_context
            ORDER BY count DESC
            LIMIT 5
          ) context_stats
        )
      )::jsonb
    ELSE
      NULL
  END;
$$;

-- Function to get activity feed for user based on their subscription
CREATE OR REPLACE FUNCTION get_user_activity_feed(
  p_user_id uuid, 
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  activity_type text,
  content_data jsonb,
  school_context uuid,
  year_context integer,
  priority_score integer,
  created_at timestamptz,
  user_profile jsonb,
  school_info jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    af.id,
    af.user_id,
    af.activity_type,
    af.content_data,
    af.school_context,
    af.year_context,
    af.priority_score,
    af.created_at,
    json_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'avatar_url', p.avatar_url
    )::jsonb as user_profile,
    json_build_object(
      'id', s.id,
      'name', s.name,
      'location', s.location
    )::jsonb as school_info
  FROM activity_feed af
  JOIN profiles p ON p.id = af.user_id
  LEFT JOIN schools s ON s.id = af.school_context
  WHERE EXISTS (
    -- User can see activity from their network
    SELECT 1 FROM user_education ue1
    JOIN user_education ue2 ON ue1.school_id = ue2.school_id
    WHERE ue1.user_id = p_user_id 
    AND ue2.user_id = af.user_id
    AND (
      -- Premium users: see all years
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id 
        AND subscription_tier IN ('premium', 'enterprise')
      )
      OR
      -- Free users: only see same years
      (ue1.start_year <= ue2.end_year AND ue1.end_year >= ue2.start_year)
    )
  )
  OR af.user_id = p_user_id -- Always see own activities
  ORDER BY af.priority_score DESC, af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function to earn bonus searches through engagement
CREATE OR REPLACE FUNCTION award_bonus_search(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only award to free users
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND subscription_tier = 'free'
  ) THEN
    INSERT INTO search_quotas (user_id, date, searches_used, search_limit, earned_searches)
    VALUES (p_user_id, CURRENT_DATE, 0, 3, 1)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
      earned_searches = search_quotas.earned_searches + 1;
      
    -- Log the bonus award
    INSERT INTO feature_usage (user_id, feature_name, usage_count)
    VALUES (p_user_id, 'bonus_search_' || p_reason, 1)
    ON CONFLICT (user_id, feature_name, date)
    DO UPDATE SET usage_count = feature_usage.usage_count + 1;
  END IF;
END;
$$;

-- Function to check message request limits for free users
CREATE OR REPLACE FUNCTION can_send_message_request(p_sender_id uuid, p_recipient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    -- Premium users can message anyone
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_sender_id 
      AND subscription_tier IN ('premium', 'enterprise')
    ) THEN true
    -- Check if permission already exists
    WHEN EXISTS (
      SELECT 1 FROM messaging_permissions
      WHERE sender_id = p_sender_id
      AND recipient_id = p_recipient_id
      AND can_message = true
    ) THEN true
    -- Free users have limited pending requests
    ELSE (
      SELECT COUNT(*) < 5
      FROM messages m
      WHERE m.sender_id = p_sender_id
      AND m.created_at > now() - interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM messages reply
        WHERE reply.sender_id = p_recipient_id
        AND reply.recipient_id = p_sender_id
        AND reply.created_at > m.created_at
      )
    )
  END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_search_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_group_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_premium_features(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_feed(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION award_bonus_search(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_send_message_request(uuid, uuid) TO authenticated;