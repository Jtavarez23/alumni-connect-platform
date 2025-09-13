-- Create notifications table for activity tracking
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'tag_suggestion', 'tag_verified', 'yearbook_upload')),
  title text NOT NULL,
  message text,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  related_entity_id uuid, -- Can reference any entity (yearbook, tag, etc.)
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Create function to update updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity feed view for better performance
CREATE VIEW public.activity_feed AS
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.created_at,
  n.read,
  CASE 
    WHEN n.related_user_id IS NOT NULL THEN
      json_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'avatar_url', p.avatar_url
      )
    ELSE NULL
  END as related_user
FROM public.notifications n
LEFT JOIN public.profiles p ON p.id = n.related_user_id
WHERE n.user_id = auth.uid()
ORDER BY n.created_at DESC;