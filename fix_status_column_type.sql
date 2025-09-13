-- Fix for status column type - it might be using an enum type instead of text with check

-- First check the actual column type
SELECT column_name, data_type, udt_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'yearbooks' AND column_name = 'status';

-- If it's using an enum type, we need to either:
-- 1. Alter the enum type to add the missing values, OR
-- 2. Change the column to text and add a check constraint

-- Option 1: Alter the enum type (if media_scan_status exists)
-- ALTER TYPE media_scan_status ADD VALUE 'ready';
-- ALTER TYPE media_scan_status ADD VALUE 'processing';
-- ALTER TYPE media_scan_status ADD VALUE 'flagged';
-- ALTER TYPE media_scan_status ADD VALUE 'pending';

-- Option 2: Change to text with check constraint (safer)
ALTER TABLE public.yearbooks 
ALTER COLUMN status TYPE text;

-- Drop any existing enum type constraint
ALTER TABLE public.yearbooks 
DROP CONSTRAINT IF EXISTS yearbooks_status_check;

-- Add new check constraint with all required values
ALTER TABLE public.yearbooks 
ADD CONSTRAINT yearbooks_status_check 
CHECK (status IN ('processing', 'ready', 'flagged', 'pending'));

-- Update existing rows to valid values if needed
UPDATE public.yearbooks 
SET status = 'processing' 
WHERE status NOT IN ('processing', 'ready', 'flagged', 'pending');

-- Verify the fix
SELECT DISTINCT status FROM public.yearbooks;