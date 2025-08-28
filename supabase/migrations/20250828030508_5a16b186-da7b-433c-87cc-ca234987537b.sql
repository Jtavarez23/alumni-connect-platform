-- Fix critical profiles table security vulnerability
-- Issue: Recursive RLS policy causing infinite recursion

-- 1. Create security definer function to get current user's school_id safely
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles based on privacy and connections" ON public.profiles;

-- 3. Create new secure policy without recursion
CREATE POLICY "Users can view profiles based on privacy and connections" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  id = auth.uid() 
  OR 
  -- Users can see friends' profiles
  id IN (
    SELECT
      CASE
        WHEN friendships.requester_id = auth.uid() THEN friendships.addressee_id
        WHEN friendships.addressee_id = auth.uid() THEN friendships.requester_id
        ELSE NULL::uuid
      END
    FROM friendships
    WHERE friendships.status = 'accepted'
      AND (friendships.requester_id = auth.uid() OR friendships.addressee_id = auth.uid())
  )
  OR 
  -- Users can see school members with appropriate privacy levels
  (
    auth.uid() IS NOT NULL 
    AND school_id = public.get_current_user_school_id()
    AND privacy_level IN ('public', 'school')
  )
  OR 
  -- Anyone can see completely public profiles
  (
    auth.uid() IS NOT NULL 
    AND privacy_level = 'public'
  )
);