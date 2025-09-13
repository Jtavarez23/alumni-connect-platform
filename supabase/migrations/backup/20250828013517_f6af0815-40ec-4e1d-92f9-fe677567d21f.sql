-- Fix security warnings by setting search_path for functions
DROP FUNCTION IF EXISTS public.calculate_user_level(integer);
DROP FUNCTION IF EXISTS public.update_user_stats_points(uuid, integer);

-- Recreate functions with proper security settings
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Level formula: sqrt(points / 100) + 1, capped at 50
  RETURN LEAST(FLOOR(SQRT(points / 100.0)) + 1, 50);
END;
$$;

-- Function to update user stats with proper security
CREATE OR REPLACE FUNCTION public.update_user_stats_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points integer;
  new_level integer;
BEGIN
  -- Only allow users to update their own stats
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own stats';
  END IF;
  
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