-- Add admin role to profiles table
ALTER TABLE public.profiles 
ADD COLUMN admin_role text CHECK (admin_role IN ('super_admin', 'admin')) DEFAULT NULL;

-- Add Stripe customer ID for subscription management
ALTER TABLE public.profiles 
ADD COLUMN stripe_customer_id text UNIQUE DEFAULT NULL;

-- Create subscription management table
CREATE TABLE public.subscription_management (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id),
  subscription_type text NOT NULL DEFAULT 'premium',
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_manual_grant boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription management
ALTER TABLE public.subscription_management ENABLE ROW LEVEL SECURITY;

-- Create admin permissions table
CREATE TABLE public.admin_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin permissions
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create content moderation table for school approvals
CREATE TABLE public.content_moderation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  moderator_id uuid REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('approved', 'denied', 'pending')),
  reason text,
  moderated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on content moderation
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND admin_role IN ('admin', 'super_admin')
  );
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND admin_role = 'super_admin'
  );
$$;

-- RLS Policies for subscription management
CREATE POLICY "Admins can manage all subscriptions" ON public.subscription_management
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own subscription grants" ON public.subscription_management
FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for admin permissions
CREATE POLICY "Super admins can manage permissions" ON public.admin_permissions
FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view their own permissions" ON public.admin_permissions
FOR SELECT USING (admin_id = auth.uid());

-- RLS Policies for content moderation
CREATE POLICY "Admins can moderate content" ON public.content_moderation
FOR ALL USING (is_admin(auth.uid()));

-- Update schools table RLS to allow admin approval
CREATE POLICY "Admins can update school submissions" ON public.schools
FOR UPDATE USING (is_admin(auth.uid()));

-- Grant yourself super admin access (replace with your actual user ID)
-- You'll need to update this with your actual user ID after checking the profiles table
-- UPDATE public.profiles SET admin_role = 'super_admin' WHERE email = 'your-email@example.com';