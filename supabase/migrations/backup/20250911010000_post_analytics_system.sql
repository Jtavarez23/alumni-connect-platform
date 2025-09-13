-- Alumni Connect Post Analytics System
-- AC-ARCH-002b compliant analytics and insights implementation

-- =============================================
-- 1. CREATE POST METRICS TABLE
-- =============================================

-- Post metrics table for detailed engagement tracking
CREATE TABLE IF NOT EXISTS public.post_metrics (
  post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0.0,
  reach_count integer DEFAULT 0,
  impression_count integer DEFAULT 0,
  saved_count integer DEFAULT 0,
  reported_count integer DEFAULT 0,
  last_engagement_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. CREATE POST ANALYTICS TABLES
-- =============================================

-- Post views tracking (for detailed view analytics)
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  view_duration integer, -- seconds
  viewed_at timestamptz DEFAULT now(),
  device_type text,
  location text,
  referral_source text
);

-- Post clicks tracking (for link/interaction analytics)
CREATE TABLE IF NOT EXISTS public.post_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  click_type text CHECK (click_type IN ('link', 'media', 'profile', 'hashtag', 'mention')),
  target_url text,
  target_id uuid,
  clicked_at timestamptz DEFAULT now()
);

-- Post engagement timeline (for time-series analysis)
CREATE TABLE IF NOT EXISTS public.post_engagement_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  hour timestamptz NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  UNIQUE(post_id, hour)
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for post_metrics
CREATE INDEX IF NOT EXISTS idx_post_metrics_engagement ON public.post_metrics(engagement_rate);
CREATE INDEX IF NOT EXISTS idx_post_metrics_updated ON public.post_metrics(updated_at);

-- Indexes for post_views
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_time ON public.post_views(viewed_at);

-- Indexes for post_clicks
CREATE INDEX IF NOT EXISTS idx_post_clicks_post_id ON public.post_clicks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_clicks_user_id ON public.post_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_clicks_type ON public.post_clicks(click_type);

-- Indexes for post_engagement_timeline
CREATE INDEX IF NOT EXISTS idx_engagement_timeline_post ON public.post_engagement_timeline(post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_timeline_hour ON public.post_engagement_timeline(hour);

-- =============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_engagement_timeline ENABLE ROW LEVEL SECURITY;

-- Post metrics: Users can view metrics for their own posts
CREATE POLICY "Users can view metrics for their own posts" ON public.post_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_metrics.post_id 
      AND posts.author_id = auth.uid()
    )
  );

-- Post views: Users can view their own view data
CREATE POLICY "Users can view their own post views" ON public.post_views
  FOR SELECT USING (user_id = auth.uid());

-- Post clicks: Users can view their own click data
CREATE POLICY "Users can view their own post clicks" ON public.post_clicks
  FOR SELECT USING (user_id = auth.uid());

-- Post engagement timeline: Users can view timeline for their own posts
CREATE POLICY "Users can view engagement timeline for their own posts" ON public.post_engagement_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_engagement_timeline.post_id 
      AND posts.author_id = auth.uid()
    )
  );

-- =============================================
-- 5. TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update post metrics when engagement occurs
CREATE OR REPLACE FUNCTION update_post_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update post_metrics table
  INSERT INTO post_metrics (post_id, like_count, comment_count, share_count, last_engagement_at)
  VALUES (
    NEW.post_id,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = NEW.post_id),
    (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id),
    (SELECT COUNT(*) FROM post_shares WHERE post_id = NEW.post_id),
    NOW()
  )
  ON CONFLICT (post_id)
  DO UPDATE SET
    like_count = EXCLUDED.like_count,
    comment_count = EXCLUDED.comment_count,
    share_count = EXCLUDED.share_count,
    last_engagement_at = EXCLUDED.last_engagement_at,
    updated_at = NOW();

  -- Update engagement rate
  UPDATE post_metrics pm
  SET engagement_rate = (
    (pm.like_count + pm.comment_count + pm.share_count) * 100.0 / 
    GREATEST(pm.view_count, 1)
  )
  WHERE pm.post_id = NEW.post_id;

  RETURN NEW;
END;
$$;

-- Function to record post views
CREATE OR REPLACE FUNCTION record_post_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record the view
  INSERT INTO post_views (post_id, user_id, viewed_at)
  VALUES (NEW.post_id, NEW.user_id, NEW.viewed_at);

  -- Update view count in post_metrics
  UPDATE post_metrics 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE post_id = NEW.post_id;

  RETURN NEW;
END;
$$;

-- Function to update engagement timeline
CREATE OR REPLACE FUNCTION update_engagement_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour timestamptz := date_trunc('hour', NOW());
BEGIN
  -- Update engagement timeline for the current hour
  INSERT INTO post_engagement_timeline (post_id, hour, likes, comments, shares, views)
  VALUES (
    NEW.post_id,
    v_hour,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = NEW.post_id AND created_at >= v_hour),
    (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id AND created_at >= v_hour),
    (SELECT COUNT(*) FROM post_shares WHERE post_id = NEW.post_id AND created_at >= v_hour),
    (SELECT COUNT(*) FROM post_views WHERE post_id = NEW.post_id AND viewed_at >= v_hour)
  )
  ON CONFLICT (post_id, hour)
  DO UPDATE SET
    likes = EXCLUDED.likes,
    comments = EXCLUDED.comments,
    shares = EXCLUDED.shares,
    views = EXCLUDED.views;

  RETURN NEW;
END;
$$;

-- =============================================
-- 6. RPC FUNCTIONS FOR ANALYTICS
-- =============================================

-- Function to get post analytics for a user
CREATE OR REPLACE FUNCTION get_post_analytics(
  p_post_id UUID DEFAULT NULL,
  p_time_range INTERVAL DEFAULT '7 days'
)
RETURNS TABLE (
  post_id UUID,
  total_likes INTEGER,
  total_comments INTEGER,
  total_shares INTEGER,
  total_views INTEGER,
  total_clicks INTEGER,
  engagement_rate NUMERIC(5,2),
  reach_count INTEGER,
  avg_view_duration INTEGER,
  top_engagement_hours TEXT[],
  click_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.post_id,
    pm.like_count,
    pm.comment_count,
    pm.share_count,
    pm.view_count,
    pm.click_count,
    pm.engagement_rate,
    pm.reach_count,
    (SELECT AVG(view_duration) FROM post_views WHERE post_id = pm.post_id)::integer,
    ARRAY(
      SELECT to_char(hour, 'HH24:00') 
      FROM post_engagement_timeline 
      WHERE post_id = pm.post_id 
      AND hour > NOW() - p_time_range
      ORDER BY (likes + comments + shares) DESC 
      LIMIT 3
    ),
    jsonb_build_object(
      'links', (SELECT COUNT(*) FROM post_clicks WHERE post_id = pm.post_id AND click_type = 'link'),
      'media', (SELECT COUNT(*) FROM post_clicks WHERE post_id = pm.post_id AND click_type = 'media'),
      'profiles', (SELECT COUNT(*) FROM post_clicks WHERE post_id = pm.post_id AND click_type = 'profile')
    )
  FROM post_metrics pm
  WHERE (p_post_id IS NULL OR pm.post_id = p_post_id)
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = pm.post_id 
      AND posts.author_id = auth.uid()
    )
  ORDER BY pm.updated_at DESC;
END;
$$;

-- Function to get user analytics overview
CREATE OR REPLACE FUNCTION get_user_analytics_overview(
  p_time_range INTERVAL DEFAULT '30 days'
)
RETURNS TABLE (
  total_posts INTEGER,
  total_likes_received INTEGER,
  total_comments_received INTEGER,
  total_shares_received INTEGER,
  total_views_received INTEGER,
  avg_engagement_rate NUMERIC(5,2),
  best_performing_post_id UUID,
  top_engagement_types JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id),
    COALESCE(SUM(pm.like_count), 0),
    COALESCE(SUM(pm.comment_count), 0),
    COALESCE(SUM(pm.share_count), 0),
    COALESCE(SUM(pm.view_count), 0),
    COALESCE(AVG(pm.engagement_rate), 0.0),
    (SELECT post_id FROM post_metrics 
     WHERE post_id IN (SELECT id FROM posts WHERE author_id = auth.uid())
     ORDER BY engagement_rate DESC LIMIT 1),
    jsonb_build_object(
      'likes', COALESCE(SUM(pm.like_count), 0),
      'comments', COALESCE(SUM(pm.comment_count), 0),
      'shares', COALESCE(SUM(pm.share_count), 0),
      'views', COALESCE(SUM(pm.view_count), 0)
    )
  FROM posts p
  LEFT JOIN post_metrics pm ON p.id = pm.post_id
  WHERE p.author_id = auth.uid()
    AND p.created_at > NOW() - p_time_range;
END;
$$;

-- Function to get engagement timeline for a post
CREATE OR REPLACE FUNCTION get_post_engagement_timeline(
  p_post_id UUID,
  p_granularity TEXT DEFAULT 'hour'
)
RETURNS TABLE (
  time_period TIMESTAMPTZ,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  views INTEGER,
  total_engagement INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_granularity = 'day' THEN date_trunc('day', hour)
      WHEN p_granularity = 'hour' THEN date_trunc('hour', hour)
      ELSE hour
    END,
    SUM(likes),
    SUM(comments),
    SUM(shares),
    SUM(views),
    SUM(likes + comments + shares)
  FROM post_engagement_timeline
  WHERE post_id = p_post_id
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = p_post_id 
      AND posts.author_id = auth.uid()
    )
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- =============================================
-- 7. INITIALIZE EXISTING POST METRICS
-- =============================================

-- Initialize metrics for existing posts
INSERT INTO post_metrics (post_id, like_count, comment_count, share_count)
SELECT 
  p.id,
  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id),
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id),
  (SELECT COUNT(*) FROM post_shares WHERE post_id = p.id)
FROM posts p
ON CONFLICT (post_id) DO NOTHING;

-- =============================================
-- 8. VERIFICATION AND VALIDATION
-- =============================================

DO $$
BEGIN
  -- Check that all required tables were created
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'post_metrics') = 1, 'post_metrics table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'post_views') = 1, 'post_views table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'post_clicks') = 1, 'post_clicks table missing';
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'post_engagement_timeline') = 1, 'post_engagement_timeline table missing';
  
  -- Check that RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'post_metrics') = true, 'RLS not enabled on post_metrics';
  
  RAISE NOTICE 'Post analytics system migration completed successfully';
END $$;