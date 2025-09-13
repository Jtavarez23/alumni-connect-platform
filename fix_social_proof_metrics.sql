-- Fix 406 (Not Acceptable) errors for social_proof_metrics table
-- This table and related tables are missing from the database schema but used in SocialProofWidget.tsx

-- Create social_proof_metrics table
CREATE TABLE IF NOT EXISTS public.social_proof_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, school_id, metric_type)
);

-- Enable RLS on the social_proof_metrics table
ALTER TABLE public.social_proof_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for social_proof_metrics
-- Users can view social proof metrics for schools they're associated with
CREATE POLICY "Users can view social proof metrics for their schools"
ON public.social_proof_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_education ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.school_id = social_proof_metrics.school_id
  )
  OR user_id = auth.uid()
);

-- Users can insert/update their own social proof metrics
CREATE POLICY "Users can manage their own social proof metrics"
ON public.social_proof_metrics FOR ALL
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_user_school ON public.social_proof_metrics(user_id, school_id);
CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_school ON public.social_proof_metrics(school_id);
CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_type ON public.social_proof_metrics(metric_type);

-- Insert sample data for the user and school mentioned in the error
-- User ID: b99870dc-6821-4b7b-985b-02c0df497b69
-- School ID: c9052f67-a349-4f89-8e02-e0fc453fc09c

INSERT INTO public.social_proof_metrics (user_id, school_id, metric_type, metric_value)
VALUES 
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'connections', 23),
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'posts', 12),
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'yearbook_claims', 5),
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'profile_views', 67)
ON CONFLICT (user_id, school_id, metric_type) 
DO UPDATE SET 
  metric_value = EXCLUDED.metric_value,
  updated_at = now();

-- Also add some additional sample data for testing
-- Generate some random sample data for testing
DO $$
DECLARE
    sample_user_id uuid := 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid;
    sample_school_id uuid := 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;
    metric_types text[] := ARRAY['connections', 'posts', 'yearbook_claims', 'profile_views', 'mutual_friends', 'recent_activity'];
    metric_type text;
BEGIN
    FOREACH metric_type IN ARRAY metric_types
    LOOP
        INSERT INTO public.social_proof_metrics (user_id, school_id, metric_type, metric_value)
        VALUES (
            sample_user_id,
            sample_school_id,
            metric_type,
            FLOOR(RANDOM() * 50 + 10)::integer
        )
        ON CONFLICT (user_id, school_id, metric_type) 
        DO UPDATE SET 
            metric_value = EXCLUDED.metric_value,
            updated_at = now();
    END LOOP;
END $$;

-- Create live_activity table for real-time user activity tracking
CREATE TABLE IF NOT EXISTS public.live_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  activity_type text DEFAULT 'browsing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on live_activity
ALTER TABLE public.live_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for live_activity
CREATE POLICY "Users can view live activity for their schools"
ON public.live_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_education ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.school_id = live_activity.school_id
  )
);

CREATE POLICY "Users can manage their own activity"
ON public.live_activity FOR ALL
USING (user_id = auth.uid());

-- Create trending_content table for viral content tracking
CREATE TABLE IF NOT EXISTS public.trending_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'memory',
  total_reactions integer DEFAULT 0,
  trending_score integer DEFAULT 0,
  time_period text DEFAULT 'daily',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on trending_content
ALTER TABLE public.trending_content ENABLE ROW LEVEL SECURITY;

-- Create policies for trending_content
CREATE POLICY "Users can view trending content for their schools"
ON public.trending_content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_education ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.school_id = trending_content.school_id
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_activity_school_active ON public.live_activity(school_id, is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_live_activity_user ON public.live_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_content_school_period ON public.trending_content(school_id, time_period, trending_score DESC);

-- Insert some sample live_activity data
INSERT INTO public.live_activity (user_id, school_id, is_active, last_activity, activity_type)
VALUES 
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, true, now(), 'browsing'),
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, true, now() - interval '2 minutes', 'viewing_profile'),
  ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, false, now() - interval '10 minutes', 'messaging')
ON CONFLICT DO NOTHING;

-- Insert some sample trending_content data
INSERT INTO public.trending_content (school_id, content_id, content_type, total_reactions, trending_score, time_period)
VALUES 
  ('c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, gen_random_uuid(), 'memory', 25, 85, 'daily'),
  ('c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, gen_random_uuid(), 'yearbook_page', 18, 72, 'daily'),
  ('c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, gen_random_uuid(), 'profile_story', 12, 58, 'daily')
ON CONFLICT DO NOTHING;

-- Update the schools table to include total_students if it doesn't exist
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS total_students integer DEFAULT 200;

-- Update the sample school with a reasonable student count
UPDATE public.schools 
SET total_students = 450
WHERE id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;

-- Verify the data was inserted
SELECT 
  'Verification: social_proof_metrics data' as info,
  user_id,
  school_id,
  metric_type,
  metric_value,
  created_at
FROM public.social_proof_metrics 
WHERE user_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid 
  AND school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
ORDER BY metric_type;

-- Verify live_activity data
SELECT 
  'Verification: live_activity data' as info,
  user_id,
  school_id,
  is_active,
  activity_type,
  last_activity
FROM public.live_activity 
WHERE user_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid 
  AND school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
ORDER BY last_activity DESC;

-- Verify trending_content data
SELECT 
  'Verification: trending_content data' as info,
  school_id,
  content_type,
  total_reactions,
  trending_score,
  time_period
FROM public.trending_content 
WHERE school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid
ORDER BY trending_score DESC;