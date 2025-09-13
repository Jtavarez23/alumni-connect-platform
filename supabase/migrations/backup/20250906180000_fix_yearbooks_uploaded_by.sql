-- Fix missing uploaded_by column in yearbooks table
-- This column is referenced in RLS policies and queries but doesn't exist

-- Add the missing uploaded_by column
ALTER TABLE public.yearbooks 
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Create foreign key to profiles table for the relationship query
-- First check if the constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'yearbooks_uploaded_by_profiles_fkey'
    AND table_name = 'yearbooks'
  ) THEN
    ALTER TABLE public.yearbooks 
    ADD CONSTRAINT yearbooks_uploaded_by_profiles_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_yearbooks_uploaded_by ON public.yearbooks(uploaded_by);

-- Update existing yearbook records to have a valid uploaded_by value if needed
-- (This is just for any existing records that might exist without this field)
UPDATE public.yearbooks 
SET uploaded_by = 'b99870dc-6821-4b7b-985b-02c0df497b69'
WHERE uploaded_by IS NULL 
  AND created_at > NOW() - INTERVAL '1 day'; -- Only recent records