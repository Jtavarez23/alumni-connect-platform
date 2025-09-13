-- Fix for missing privacy_settings column in profiles table
-- Run this BEFORE the RLS policies migration

-- Add privacy_settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"profile_visibility": "public"}'::jsonb;

-- Update existing rows to have default privacy settings
UPDATE public.profiles 
SET privacy_settings = '{"profile_visibility": "public"}'::jsonb 
WHERE privacy_settings IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.privacy_settings IS 'User privacy settings including profile_visibility (public, connections, private)';

-- Verify the column was added
SELECT COUNT(*) as has_privacy_settings 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'privacy_settings';