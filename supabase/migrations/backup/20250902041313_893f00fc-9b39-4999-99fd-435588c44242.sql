-- Make the first user in the system a super admin
-- You'll need to replace this with your actual user ID or email
UPDATE public.profiles 
SET admin_role = 'super_admin' 
WHERE email = (SELECT email FROM public.profiles ORDER BY created_at LIMIT 1);