-- Fix for missing uploaded_by column in yearbooks table
-- Run this BEFORE the RLS policies migration

-- Add uploaded_by column to yearbooks table
ALTER TABLE public.yearbooks 
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Set default uploaded_by for existing yearbooks (use first user or NULL)
UPDATE public.yearbooks 
SET uploaded_by = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE uploaded_by IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.yearbooks.uploaded_by IS 'User who uploaded this yearbook';

-- Verify the column was added
SELECT COUNT(*) as has_uploaded_by 
FROM information_schema.columns 
WHERE table_name = 'yearbooks' AND column_name = 'uploaded_by';