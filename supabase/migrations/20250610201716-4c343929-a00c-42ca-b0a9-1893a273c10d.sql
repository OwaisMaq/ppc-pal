
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles" 
  ON public.user_roles 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid
      AND role = role_name
  )
$$;

-- Update the can_user_optimize function to check for admin role
CREATE OR REPLACE FUNCTION public.can_user_optimize(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_plan public.subscription_plan;
  current_usage INTEGER;
  usage_limit INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin first
  SELECT public.has_role(user_uuid, 'admin') INTO is_admin;
  
  -- If user is admin, allow unlimited optimizations
  IF is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's current plan
  SELECT plan_type INTO user_plan
  FROM public.subscriptions
  WHERE user_id = user_uuid AND status = 'active';
  
  -- If no subscription found, default to free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Get usage limit for the plan
  SELECT optimization_limit INTO usage_limit
  FROM public.usage_limits
  WHERE plan_type = user_plan;
  
  -- Get current usage for this month
  SELECT COALESCE(optimizations_used, 0) INTO current_usage
  FROM public.usage_tracking
  WHERE user_id = user_uuid 
    AND period_start = date_trunc('month', now());
  
  -- If no usage record exists, create one
  IF current_usage IS NULL THEN
    INSERT INTO public.usage_tracking (user_id, optimizations_used)
    VALUES (user_uuid, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;
    current_usage := 0;
  END IF;
  
  -- Check if user is under limit
  RETURN current_usage < usage_limit;
END;
$$;

-- Grant admin role to owais.maqsood@outlook.com
-- First, we need to find the user ID for this email
-- This will be done after the user signs up, but we'll create a function to help with this
CREATE OR REPLACE FUNCTION public.grant_admin_role_by_email(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user ID by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- If user exists, grant admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Grant admin role to the specified email
SELECT public.grant_admin_role_by_email('owais.maqsood@outlook.com');
