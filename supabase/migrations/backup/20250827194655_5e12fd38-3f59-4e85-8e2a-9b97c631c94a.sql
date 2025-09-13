-- Fix function search path security warning
ALTER FUNCTION public.update_conversation_last_message() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';