-- Create student_tags table to link yearbook entries to user profiles
CREATE TABLE public.student_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_entry_id uuid REFERENCES yearbook_entries(id) ON DELETE CASCADE NOT NULL,
  tagged_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tagged_by_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  verification_status text CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(yearbook_entry_id, tagged_profile_id)
);

-- Create tag_suggestions table for AI/manual suggestions  
CREATE TABLE public.tag_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  yearbook_entry_id uuid REFERENCES yearbook_entries(id) ON DELETE CASCADE NOT NULL,
  suggested_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  suggested_by_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type text CHECK (suggestion_type IN ('manual', 'ai', 'similarity')) DEFAULT 'manual',
  confidence_score decimal(3,2) DEFAULT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

-- Create tag_verifications table for peer verification system
CREATE TABLE public.tag_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_tag_id uuid REFERENCES student_tags(id) ON DELETE CASCADE NOT NULL,
  verifier_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  verification_type text CHECK (verification_type IN ('peer', 'self', 'mutual_friend')) DEFAULT 'peer',
  is_verified boolean NOT NULL,
  verification_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_tag_id, verifier_id)
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_tags
CREATE POLICY "Users can view tags on yearbook entries they have access to"
ON public.student_tags FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Can see tags on their own entries
    tagged_profile_id = auth.uid() OR 
    tagged_by_id = auth.uid() OR
    -- Can see tags on yearbook entries they have access to
    yearbook_entry_id IN (
      SELECT ye.id FROM yearbook_entries ye
      JOIN yearbook_editions ed ON ye.edition_id = ed.id
      WHERE (
        -- Same school access
        ed.school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()) OR
        -- Friend access
        ed.school_id IN (
          SELECT DISTINCT p.school_id
          FROM profiles p
          JOIN friendships f ON (
            ((f.requester_id = p.id AND f.addressee_id = auth.uid()) OR
             (f.addressee_id = p.id AND f.requester_id = auth.uid()))
          )
          WHERE f.status = 'accepted' AND p.school_id IS NOT NULL
        )
      )
    )
  )
);

CREATE POLICY "Users can create tags for accessible yearbook entries"
ON public.student_tags FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  tagged_by_id = auth.uid() AND
  yearbook_entry_id IN (
    SELECT ye.id FROM yearbook_entries ye
    JOIN yearbook_editions ed ON ye.edition_id = ed.id
    WHERE (
      ed.school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()) OR
      ed.school_id IN (
        SELECT DISTINCT p.school_id
        FROM profiles p
        JOIN friendships f ON (
          ((f.requester_id = p.id AND f.addressee_id = auth.uid()) OR
           (f.addressee_id = p.id AND f.requester_id = auth.uid()))
        )
        WHERE f.status = 'accepted' AND p.school_id IS NOT NULL
      )
    )
  )
);

CREATE POLICY "Users can update their own tags or tags they're tagged in"
ON public.student_tags FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    tagged_by_id = auth.uid() OR 
    tagged_profile_id = auth.uid()
  )
);

-- Create RLS policies for tag_suggestions
CREATE POLICY "Users can view tag suggestions for themselves"
ON public.tag_suggestions FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    suggested_profile_id = auth.uid() OR
    suggested_by_id = auth.uid()
  )
);

CREATE POLICY "Users can create tag suggestions"
ON public.tag_suggestions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  suggested_by_id = auth.uid()
);

CREATE POLICY "Users can update their own suggestions or suggestions about them"
ON public.tag_suggestions FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    suggested_by_id = auth.uid() OR
    suggested_profile_id = auth.uid()
  )
);

-- Create RLS policies for tag_verifications
CREATE POLICY "Users can view verifications for their tags"
ON public.tag_verifications FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    verifier_id = auth.uid() OR
    student_tag_id IN (
      SELECT id FROM student_tags 
      WHERE tagged_profile_id = auth.uid() OR tagged_by_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create verifications"
ON public.tag_verifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  verifier_id = auth.uid()
);

-- Create indexes for efficient querying
CREATE INDEX idx_student_tags_yearbook_entry ON student_tags(yearbook_entry_id);
CREATE INDEX idx_student_tags_tagged_profile ON student_tags(tagged_profile_id);
CREATE INDEX idx_student_tags_verification_status ON student_tags(verification_status);
CREATE INDEX idx_tag_suggestions_suggested_profile ON tag_suggestions(suggested_profile_id);
CREATE INDEX idx_tag_suggestions_status ON tag_suggestions(status);
CREATE INDEX idx_tag_verifications_student_tag ON tag_verifications(student_tag_id);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_student_tags_updated_at
  BEFORE UPDATE ON public.student_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();