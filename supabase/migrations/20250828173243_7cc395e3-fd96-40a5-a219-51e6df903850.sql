-- Fix RLS recursion issue by dropping all problematic policies first
DROP POLICY IF EXISTS "School administrators can manage their schools" ON public.school_administrators;
DROP POLICY IF EXISTS "Users can view administrators for their schools" ON public.school_administrators;

-- Create security definer function to check admin permissions
CREATE OR REPLACE FUNCTION public.is_school_admin(user_id uuid, school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM school_administrators sa
    WHERE sa.user_id = user_id 
    AND sa.school_id = school_id 
    AND sa.status = 'active'
    AND sa.role IN ('principal', 'vice_principal', 'admin')
  );
$$;

-- Recreate simplified RLS policies for school_administrators
CREATE POLICY "View administrators for schools" ON public.school_administrators
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    school_id IN (
      SELECT sh.school_id FROM school_history sh WHERE sh.user_id = auth.uid()
    ) OR 
    school_id = get_current_user_school_id() OR 
    user_id = auth.uid()
  )
);

CREATE POLICY "Manage school administration" ON public.school_administrators
FOR ALL USING (
  user_id = auth.uid() OR 
  is_school_admin(auth.uid(), school_administrators.school_id)
)
WITH CHECK (
  user_id = auth.uid() OR 
  is_school_admin(auth.uid(), school_administrators.school_id)
);

-- Add social media fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text;