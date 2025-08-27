-- Add new privacy and notification preference columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_in_search boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_friend_requests boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_messages boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_tags boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_graduation_year boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_school boolean DEFAULT true;