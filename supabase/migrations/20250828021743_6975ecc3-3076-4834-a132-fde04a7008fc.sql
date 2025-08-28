-- Create class channels table
CREATE TABLE public.class_channels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  graduation_year integer NOT NULL,
  channel_type text DEFAULT 'general' CHECK (channel_type IN ('general', 'memories', 'events', 'study_groups', 'sports', 'clubs')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_private boolean DEFAULT false,
  member_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, graduation_year, name)
);

-- Create channel members table
CREATE TABLE public.channel_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid REFERENCES public.class_channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  notifications_enabled boolean DEFAULT true,
  UNIQUE(channel_id, user_id)
);

-- Create channel messages table
CREATE TABLE public.channel_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid REFERENCES public.class_channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to_id uuid REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  thread_count integer DEFAULT 0,
  reactions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

-- Enable RLS
ALTER TABLE public.class_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_channels
CREATE POLICY "Users can view channels they're members of or from their school"
ON public.class_channels FOR SELECT
USING (
  id IN (
    SELECT channel_id FROM public.channel_members 
    WHERE user_id = auth.uid()
  )
  OR
  (
    school_id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND school_id IS NOT NULL
    )
    AND graduation_year IN (
      SELECT graduation_year FROM public.profiles 
      WHERE id = auth.uid() AND graduation_year IS NOT NULL
    )
    AND NOT is_private
  )
);

CREATE POLICY "Users can create channels for their school/year"
ON public.class_channels FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.profiles 
    WHERE id = auth.uid() AND school_id IS NOT NULL
  )
  AND graduation_year IN (
    SELECT graduation_year FROM public.profiles 
    WHERE id = auth.uid() AND graduation_year IS NOT NULL
  )
  AND created_by = auth.uid()
);

-- RLS Policies for channel_members
CREATE POLICY "Users can view members of channels they belong to"
ON public.channel_members FOR SELECT
USING (
  channel_id IN (
    SELECT channel_id FROM public.channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join channels they have access to"
ON public.channel_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND channel_id IN (
    SELECT id FROM public.class_channels
    WHERE (
      school_id IN (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND school_id IS NOT NULL
      )
      AND graduation_year IN (
        SELECT graduation_year FROM public.profiles 
        WHERE id = auth.uid() AND graduation_year IS NOT NULL
      )
    )
  )
);

-- RLS Policies for channel_messages
CREATE POLICY "Users can view messages in channels they're members of"
ON public.channel_messages FOR SELECT
USING (
  channel_id IN (
    SELECT channel_id FROM public.channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to channels they're members of"
ON public.channel_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND channel_id IN (
    SELECT channel_id FROM public.channel_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.channel_messages FOR UPDATE
USING (sender_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_class_channels_school_year ON public.class_channels(school_id, graduation_year);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX idx_channel_messages_channel ON public.channel_messages(channel_id, created_at DESC);
CREATE INDEX idx_channel_messages_thread ON public.channel_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Function to update channel last_message_at
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.class_channels 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$;

-- Trigger for updating channel last message time
CREATE TRIGGER update_channel_last_message_trigger
  AFTER INSERT ON public.channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_last_message();

-- Function to update member count
CREATE OR REPLACE FUNCTION update_channel_member_count()
RETURNS trigger
LANGUAGE plpgsql
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

-- Triggers for updating member count
CREATE TRIGGER update_channel_member_count_insert
  AFTER INSERT ON public.channel_members
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_member_count();

CREATE TRIGGER update_channel_member_count_delete
  AFTER DELETE ON public.channel_members
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_member_count();