-- Essential fix for mentorship features
-- Only creates missing tables without policy conflicts

-- Create mentorship_profiles table if not exists
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('mentor','mentee','both')) DEFAULT 'both',
  topics text[],
  availability jsonb DEFAULT '{}',
  bio text,
  years_experience integer,
  expertise text[],
  industry text,
  current_company text,
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mentorship_matches table if not exists
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('suggested','pending','accepted','declined','ended')) DEFAULT 'suggested',
  match_score integer DEFAULT 0,
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;

-- Create essential RLS policies
DO $$ BEGIN
  -- Policy for viewing mentorship profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_profiles' 
    AND policyname = 'Users can view all mentorship profiles'
  ) THEN
    CREATE POLICY "Users can view all mentorship profiles" ON public.mentorship_profiles
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Policy for managing own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_profiles' 
    AND policyname = 'Users can manage their own mentorship profile'
  ) THEN
    CREATE POLICY "Users can manage their own mentorship profile" ON public.mentorship_profiles
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for viewing matches
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mentorship_matches' 
    AND policyname = 'Users can view their mentorship matches'
  ) THEN
    CREATE POLICY "Users can view their mentorship matches" ON public.mentorship_matches
      FOR SELECT TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
  END IF;
END $$;

-- Create essential RPC function for mentorship matches
CREATE OR REPLACE FUNCTION get_mentorship_matches(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  mentor_id uuid,
  mentee_id uuid,
  status text,
  match_score integer,
  message text,
  created_at timestamptz,
  mentor_profile jsonb,
  mentee_profile jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH user_id AS (
    SELECT COALESCE(p_user_id, auth.uid()) as id
  )
  SELECT 
    mm.id,
    mm.mentor_id,
    mm.mentee_id,
    mm.status,
    mm.match_score,
    mm.message,
    mm.created_at,
    jsonb_build_object(
      'display_name', COALESCE(mp.display_name, mp.first_name || ' ' || mp.last_name),
      'avatar_url', mp.avatar_url,
      'expertise', COALESCE(mmp.expertise, ARRAY[]::text[]),
      'industry', mmp.industry,
      'current_company', mmp.current_company
    ) as mentor_profile,
    jsonb_build_object(
      'display_name', COALESCE(mep.display_name, mep.first_name || ' ' || mep.last_name),
      'avatar_url', mep.avatar_url,
      'topics', COALESCE(mmep.topics, ARRAY[]::text[])
    ) as mentee_profile
  FROM public.mentorship_matches mm
  JOIN user_id ui ON (ui.id = mm.mentor_id OR ui.id = mm.mentee_id)
  LEFT JOIN public.profiles mp ON mp.id = mm.mentor_id
  LEFT JOIN public.profiles mep ON mep.id = mm.mentee_id
  LEFT JOIN public.mentorship_profiles mmp ON mmp.user_id = mm.mentor_id
  LEFT JOIN public.mentorship_profiles mmep ON mmep.user_id = mm.mentee_id
  ORDER BY mm.created_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentorship_matches TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_user ON public.mentorship_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_role ON public.mentorship_profiles(role);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor ON public.mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee ON public.mentorship_matches(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_status ON public.mentorship_matches(status);