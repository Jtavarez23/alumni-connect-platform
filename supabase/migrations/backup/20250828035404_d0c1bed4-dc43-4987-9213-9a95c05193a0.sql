-- Fix security definer function search_path issues
-- Update all functions to have proper search_path set

-- Fix the function that's causing security warnings
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Update other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, graduation_year)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN new.raw_user_meta_data->>'graduation_year' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'graduation_year')::integer
      ELSE NULL
    END
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_channel_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.class_channels 
    SET member_count = member_count + 1
    WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.class_channels 
    SET member_count = member_count - 1
    WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Level formula: sqrt(points / 100) + 1, capped at 50
  RETURN LEAST(FLOOR(SQRT(points / 100.0)) + 1, 50);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_stats_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_channel_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.class_channels 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$;

-- Add missing foreign key for then_vs_now_posts to profiles
ALTER TABLE public.then_vs_now_posts 
ADD CONSTRAINT fk_then_vs_now_posts_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;