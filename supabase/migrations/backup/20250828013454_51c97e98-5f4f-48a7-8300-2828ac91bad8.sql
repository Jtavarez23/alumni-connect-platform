-- Create badge types table for defining available badges
CREATE TABLE public.badge_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT '#06B6D4',
  requirement_type text NOT NULL CHECK (requirement_type IN ('count', 'streak', 'special')),
  requirement_value integer,
  category text NOT NULL CHECK (category IN ('social', 'discovery', 'engagement', 'milestone')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

-- Create user badges table for tracking earned badges
CREATE TABLE public.user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type_id uuid REFERENCES badge_types(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  progress_data jsonb DEFAULT '{}',
  UNIQUE(user_id, badge_type_id)
);

-- Create user stats table for tracking engagement metrics
CREATE TABLE public.user_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  total_reactions integer DEFAULT 0,
  total_tags integer DEFAULT 0,
  total_connections integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  total_yearbooks_viewed integer DEFAULT 0,
  points integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create achievements progress table
CREATE TABLE public.achievement_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_key text NOT NULL,
  current_value integer DEFAULT 0,
  target_value integer NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- Enable RLS
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_types (read-only for all authenticated users)
CREATE POLICY "Badge types are viewable by all authenticated users"
ON public.badge_types FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create user badges"
ON public.user_badges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create user stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view their own achievement progress"
ON public.achievement_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievement progress"
ON public.achievement_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on achievement_progress
CREATE TRIGGER update_achievement_progress_updated_at
BEFORE UPDATE ON public.achievement_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badge types
INSERT INTO public.badge_types (name, title, description, icon, color, requirement_type, requirement_value, category, rarity) VALUES
('first_tag', 'Memory Maker', 'Tagged your first yearbook photo', 'Tag', '#10B981', 'count', 1, 'discovery', 'common'),
('first_reaction', 'Reactor', 'Added your first reaction to a memory', 'Heart', '#EF4444', 'count', 1, 'engagement', 'common'),
('first_connection', 'Connector', 'Made your first friend connection', 'Users', '#06B6D4', 'count', 1, 'social', 'common'),
('streak_7', 'Week Warrior', 'Maintained a 7-day activity streak', 'Flame', '#F59E0B', 'streak', 7, 'engagement', 'rare'),
('streak_30', 'Month Master', 'Maintained a 30-day activity streak', 'Crown', '#8B5CF6', 'streak', 30, 'engagement', 'epic'),
('tag_master', 'Tag Master', 'Tagged 50+ yearbook photos', 'Camera', '#06B6D4', 'count', 50, 'discovery', 'rare'),
('social_butterfly', 'Social Butterfly', 'Connected with 25+ classmates', 'UserPlus', '#EC4899', 'count', 25, 'social', 'epic'),
('yearbook_explorer', 'Yearbook Explorer', 'Viewed 10+ different yearbooks', 'Book', '#3B82F6', 'count', 10, 'discovery', 'rare'),
('reaction_enthusiast', 'Reaction Enthusiast', 'Added 100+ reactions', 'Star', '#F59E0B', 'count', 100, 'engagement', 'epic'),
('legend', 'Yearbook Legend', 'Reached level 10 in the platform', 'Trophy', '#FFD700', 'special', 10, 'milestone', 'legendary');

-- Function to calculate user level based on points
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- Level formula: sqrt(points / 100) + 1, capped at 50
  RETURN LEAST(FLOOR(SQRT(points / 100.0)) + 1, 50);
END;
$$;

-- Function to update user stats
CREATE OR REPLACE FUNCTION public.update_user_stats_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  new_points integer;
  new_level integer;
BEGIN
  -- Insert or update user stats
  INSERT INTO public.user_stats (user_id, points)
  VALUES (user_id, points_to_add)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    points = user_stats.points + points_to_add,
    updated_at = now();
  
  -- Get new points and calculate level
  SELECT points INTO new_points 
  FROM public.user_stats 
  WHERE public.user_stats.user_id = update_user_stats_points.user_id;
  
  new_level := public.calculate_user_level(new_points);
  
  -- Update level
  UPDATE public.user_stats 
  SET level = new_level
  WHERE public.user_stats.user_id = update_user_stats_points.user_id;
END;
$$;