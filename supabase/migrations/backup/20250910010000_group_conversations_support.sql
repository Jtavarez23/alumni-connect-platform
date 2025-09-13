-- Group Conversations Support Migration
-- Adds conversation participants table and updates RLS policies

-- =============================================
-- 1. CONVERSATION PARTICIPANTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('member', 'admin')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE(conversation_id, user_id)
);

-- =============================================
-- 2. ADD READ_AT COLUMN TO MESSAGES TABLE
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE public.messages ADD COLUMN read_at timestamptz;
  END IF;
END$$;

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS POLICIES
-- =============================================

-- Conversation participants: Users can only see participants in conversations they're in
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view participants in their conversations' AND tablename = 'conversation_participants') THEN
    CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Conversation participants: Users can only manage their own participation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own participation' AND tablename = 'conversation_participants') THEN
    CREATE POLICY "Users can manage their own participation" ON public.conversation_participants
    FOR ALL USING (auth.uid() = user_id);
  END IF;
END$$;

-- Conversations: Users can only see conversations they're participants in
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view conversations they participate in' AND tablename = 'conversations') THEN
    CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Messages: Users can only see messages in conversations they're participants in
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages in their conversations' AND tablename = 'messages') THEN
    CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Messages: Users can only send messages in conversations they're participants in
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages in their conversations' AND tablename = 'messages') THEN
    CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
      ) AND sender_id = auth.uid()
    );
  END IF;
END$$;

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);

-- =============================================
-- 6. FUNCTIONS FOR GROUP MANAGEMENT
-- =============================================

-- Function to create a group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_title text,
  participant_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_conversation_id uuid;
  participant_id uuid;
BEGIN
  -- Create the conversation
  INSERT INTO public.conversations (is_group, title, created_by)
  VALUES (true, group_title, auth.uid())
  RETURNING id INTO new_conversation_id;

  -- Add participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (new_conversation_id, participant_id, 
            CASE WHEN participant_id = auth.uid() THEN 'admin' ELSE 'member' END);
  END LOOP;

  RETURN new_conversation_id;
END;
$$;

-- Function to add participant to group
CREATE OR REPLACE FUNCTION public.add_group_participant(
  conversation_id uuid,
  new_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = $1
    AND user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only group admins can add participants';
  END IF;

  -- Add the participant
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES ($1, $2)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  target_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_read_at for participant
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = target_conversation_id
  AND user_id = auth.uid();

  -- Mark messages as read
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = target_conversation_id
  AND sender_id != auth.uid()
  AND read_at IS NULL;
END;
$$;

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION public.create_group_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

-- =============================================
-- 8. VERIFICATION
-- =============================================

DO $$
BEGIN
  -- Verify tables exist
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'conversation_participants') = 1, 'conversation_participants table missing';
  
  -- Verify columns exist
  ASSERT (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'read_at') = 1, 'read_at column missing from messages';
  
  -- Verify RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'conversation_participants') = true, 'RLS not enabled on conversation_participants';
  
  RAISE NOTICE 'Group conversations migration completed successfully';
END $$;