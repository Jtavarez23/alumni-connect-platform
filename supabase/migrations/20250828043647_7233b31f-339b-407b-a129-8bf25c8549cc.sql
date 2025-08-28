-- Drop the existing check constraint
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_type_check;

-- Add new check constraint with all school types
ALTER TABLE public.schools ADD CONSTRAINT schools_type_check 
CHECK (type IN (
  'elementary_school',
  'middle_school', 
  'high_school',
  'community_college',
  'college',
  'university',
  'graduate_school',
  'trade_school',
  'private_school',
  'charter_school',
  'online_school',
  'international_school'
));