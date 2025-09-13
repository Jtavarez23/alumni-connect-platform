-- Create reactions table for emoji reactions system
CREATE TABLE public.reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('yearbook_entry', 'tag', 'story', 'post')),
  reaction_type text NOT NULL CHECK (reaction_type IN ('aww', 'iconic', 'lol', 'goals', 'memories', 'omg')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_id, entity_type)
);

-- Create mystery_lookups table for "Someone is looking for you" feature
CREATE TABLE public.mystery_lookups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  looker_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  school_name text NOT NULL,
  graduation_year integer,
  mutual_friends_count integer DEFAULT 0,
  clues jsonb DEFAULT '{}',
  revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_lookups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions
CREATE POLICY "Users can view reactions on accessible content"
ON public.reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own reactions"
ON public.reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.reactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.reactions
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for mystery_lookups
CREATE POLICY "Users can view mystery lookups about them"
ON public.mystery_lookups
FOR SELECT
USING (auth.uid() = target_user_id OR auth.uid() = looker_id);

CREATE POLICY "System can create mystery lookups"
ON public.mystery_lookups
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update mystery lookups about them"
ON public.mystery_lookups
FOR UPDATE
USING (auth.uid() = target_user_id);

-- Create updated_at trigger for reactions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reactions_updated_at
  BEFORE UPDATE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();