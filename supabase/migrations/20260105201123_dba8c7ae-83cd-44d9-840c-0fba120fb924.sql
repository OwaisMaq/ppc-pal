-- Add profile_limit to usage_limits table
ALTER TABLE usage_limits 
ADD COLUMN IF NOT EXISTS profile_limit integer NOT NULL DEFAULT 100;

-- Set appropriate limits per plan
UPDATE usage_limits SET profile_limit = 1 WHERE plan_type = 'free';
UPDATE usage_limits SET profile_limit = 100 WHERE plan_type = 'pro';

-- Add is_managed flag to amazon_connections
ALTER TABLE amazon_connections 
ADD COLUMN IF NOT EXISTS is_managed boolean NOT NULL DEFAULT false;

-- Create function to check if user can add more profiles
CREATE OR REPLACE FUNCTION public.can_add_profile(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
  user_plan text;
BEGIN
  -- Get user's plan from subscriptions
  SELECT COALESCE(plan_type, 'free') INTO user_plan
  FROM subscriptions WHERE user_id = user_uuid;
  
  -- If no subscription found, default to free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Get limit for plan
  SELECT profile_limit INTO max_allowed
  FROM usage_limits WHERE plan_type = user_plan;
  
  -- Default to 1 if no limit found
  IF max_allowed IS NULL THEN
    max_allowed := 1;
  END IF;
  
  -- Count current connections
  SELECT COUNT(*) INTO current_count
  FROM amazon_connections WHERE user_id = user_uuid;
  
  RETURN current_count < max_allowed;
END;
$$;

-- Create function to get profile limit info for a user
CREATE OR REPLACE FUNCTION public.get_profile_limit_info(user_uuid uuid)
RETURNS TABLE(current_count integer, max_allowed integer, can_add boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
BEGIN
  -- Get user's plan
  SELECT COALESCE(s.plan_type, 'free') INTO user_plan
  FROM subscriptions s WHERE s.user_id = user_uuid;
  
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM amazon_connections ac WHERE ac.user_id = user_uuid) as current_count,
    COALESCE((SELECT ul.profile_limit FROM usage_limits ul WHERE ul.plan_type = user_plan), 1) as max_allowed,
    (SELECT COUNT(*)::integer FROM amazon_connections ac WHERE ac.user_id = user_uuid) < 
      COALESCE((SELECT ul.profile_limit FROM usage_limits ul WHERE ul.plan_type = user_plan), 1) as can_add;
END;
$$;