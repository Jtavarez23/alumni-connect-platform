-- Drop the problematic view and recreate it without SECURITY DEFINER
DROP VIEW IF EXISTS public.activity_feed;

-- Create a simple view without SECURITY DEFINER (RLS will handle security)
CREATE VIEW public.activity_feed AS
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.created_at,
  n.read,
  n.related_user_id,
  n.user_id
FROM public.notifications n
WHERE n.user_id = auth.uid()
ORDER BY n.created_at DESC;