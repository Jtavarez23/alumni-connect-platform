-- Enable Row Level Security on activity_feed table
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own activity feed items
CREATE POLICY "Users can view their own activity feed"
ON public.activity_feed
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only update their own activity feed items (for marking as read)
CREATE POLICY "Users can update their own activity feed"
ON public.activity_feed
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: System can create activity feed items for users
CREATE POLICY "System can create activity feed items"
ON public.activity_feed
FOR INSERT
WITH CHECK (user_id IS NOT NULL);