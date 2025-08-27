-- Fix function search path security warning
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- The OTP expiry warning is related to Supabase auth settings, not our code