-- Fix yearbook upload RLS policy issue
-- The current policy requires uploaded_by = auth.uid() but the upload dialog doesn't set this field

-- Drop the restrictive policy and create a better one
DROP POLICY IF EXISTS "Authenticated users can upload yearbook editions" ON yearbook_editions;

-- Create a more flexible policy that allows inserts when the user is authenticated
-- and the school_id matches their profile school or they have multi-school access
CREATE POLICY "Users can upload yearbook editions for accessible schools" 
ON yearbook_editions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User can upload for their own school
    school_id IN (
      SELECT ue.school_id 
      FROM user_education ue 
      WHERE ue.user_id = auth.uid()
    ) OR
    -- User can upload for schools they have access to (fallback to profiles table)
    school_id IN (
      SELECT p.school_id 
      FROM profiles p 
      WHERE p.id = auth.uid() AND p.school_id IS NOT NULL
    )
  )
);

-- Also ensure the uploaded_by field gets set automatically
-- Update yearbook_editions to set uploaded_by to current user by default
ALTER TABLE yearbook_editions ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

-- Fix profiles school_history reference issue
-- The onboarding popup issue is likely due to useSchoolHistory hook still referencing old table
-- Let's ensure the profiles table has the right structure and data consistency

-- Check if profiles have proper school associations via user_education
-- Create a function to sync profile school_id with latest user_education entry
CREATE OR REPLACE FUNCTION sync_profile_school() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile school_id to most recent education entry
  UPDATE profiles 
  SET school_id = (
    SELECT schools.id 
    FROM user_education 
    JOIN schools ON schools.id = user_education.school_id
    WHERE user_education.user_id = NEW.user_id 
    ORDER BY user_education.end_year DESC NULLS FIRST, user_education.start_year DESC 
    LIMIT 1
  )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep profiles.school_id in sync
DROP TRIGGER IF EXISTS sync_profile_school_trigger ON user_education;
CREATE TRIGGER sync_profile_school_trigger
  AFTER INSERT OR UPDATE ON user_education
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_school();

-- Run the sync for existing users to fix any inconsistencies
UPDATE profiles 
SET school_id = (
  SELECT schools.id 
  FROM user_education 
  JOIN schools ON schools.id = user_education.school_id
  WHERE user_education.user_id = profiles.id 
  ORDER BY user_education.end_year DESC NULLS FIRST, user_education.start_year DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM user_education WHERE user_id = profiles.id
);

-- Ensure all authenticated users can read their own profile and school data
CREATE POLICY IF NOT EXISTS "Users can read their own profile data" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Also allow reading of school data for schools the user has access to
CREATE POLICY IF NOT EXISTS "Users can read accessible school data" 
ON schools 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT school_id FROM user_education WHERE user_id = auth.uid()) OR
    id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND school_id IS NOT NULL)
  )
);