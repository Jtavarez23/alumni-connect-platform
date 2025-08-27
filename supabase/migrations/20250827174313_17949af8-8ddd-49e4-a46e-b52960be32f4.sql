-- Add fields to schools table for user submissions
ALTER TABLE public.schools 
ADD COLUMN user_submitted boolean DEFAULT false,
ADD COLUMN submission_status text DEFAULT 'approved' CHECK (submission_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN submitted_by uuid REFERENCES auth.users(id);

-- Update RLS policies to allow authenticated users to insert schools
CREATE POLICY "Authenticated users can submit schools" 
ON public.schools 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_submitted = true AND submitted_by = auth.uid());

-- Allow users to view their own submitted schools even if pending
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;

CREATE POLICY "Users can view approved schools and their own submissions" 
ON public.schools 
FOR SELECT 
USING (
  submission_status = 'approved' OR 
  (submission_status = 'pending' AND submitted_by = auth.uid())
);