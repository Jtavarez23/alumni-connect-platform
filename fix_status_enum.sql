-- Fix for status enum constraint in yearbooks table
-- Check current enum values and add 'ready' if needed

-- First check what values the status enum allows
SELECT unnest(enum_range(NULL::text)) as allowed_statuses;

-- If 'ready' is not in the enum, we need to alter it
-- Note: You may need to drop and recreate the constraint if ALTER TYPE doesn't work

-- Alternative: Drop the check constraint and recreate with correct values
ALTER TABLE public.yearbooks 
DROP CONSTRAINT IF EXISTS yearbooks_status_check;

ALTER TABLE public.yearbooks 
ADD CONSTRAINT yearbooks_status_check 
CHECK (status IN ('processing', 'ready', 'flagged', 'pending'));

-- Update existing 'ready' statuses if they exist
UPDATE public.yearbooks 
SET status = 'ready' 
WHERE status = 'ready';

-- Verify the constraint
SELECT constraint_name, constraint_type, definition 
FROM information_schema.table_constraints 
WHERE table_name = 'yearbooks' AND constraint_type = 'CHECK';