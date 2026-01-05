-- Fix get_profile_limit_info function to properly cast between text and subscription_plan enum
CREATE OR REPLACE FUNCTION public.get_profile_limit_info(user_uuid uuid)
RETURNS TABLE(current_count integer, max_allowed integer, can_add boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  -- Get user's plan (cast to enum)
  SELECT s.plan_type INTO user_plan
  FROM subscriptions s WHERE s.user_id = user_uuid;
  
  -- Default to 'free' if no subscription found
  IF user_plan IS NULL THEN
    user_plan := 'free'::subscription_plan;
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM amazon_connections ac WHERE ac.user_id = user_uuid) as current_count,
    COALESCE((SELECT ul.profile_limit FROM usage_limits ul WHERE ul.plan_type = user_plan), 1) as max_allowed,
    (SELECT COUNT(*)::integer FROM amazon_connections ac WHERE ac.user_id = user_uuid) < 
      COALESCE((SELECT ul.profile_limit FROM usage_limits ul WHERE ul.plan_type = user_plan), 1) as can_add;
END;
$$;