-- Fix remaining function security issues

-- Fix search_path for all remaining functions
ALTER FUNCTION public.update_ams_subscriptions_updated_at() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.sync_amazon_data_v3(uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.sync_amazon_data(uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.cleanup_and_create_sync_job(uuid, uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.rollup_campaign_aggregates_14d(uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_ams_data_freshness(uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.set_config(text, text, boolean) SET search_path = 'public', 'extensions';
ALTER FUNCTION public."private.store_tokens"(uuid, text, text, text, timestamp with time zone) SET search_path = 'public', 'private', 'extensions';
ALTER FUNCTION public.get_tokens(text) SET search_path = 'public', 'private', 'extensions';
ALTER FUNCTION public.update_documentation_updated_at() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.extract_asin_from_name(text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.grant_admin_role_by_email(text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.create_optimization_batch(uuid, uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_campaign_rollup_kpis(text[], date, date, text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.store_tokens_with_key(uuid, text, text, text, timestamp with time zone, text) SET search_path = 'public', 'private', 'extensions';
ALTER FUNCTION public.calculate_campaign_changes() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.can_user_optimize(uuid) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.handle_new_user_subscription() SET search_path = 'public', 'extensions';
ALTER FUNCTION public.increment_optimization_usage(uuid) SET search_path = 'public', 'extensions';

-- Add proper security definer functions where needed to replace insecure patterns
CREATE OR REPLACE FUNCTION public.secure_profile_access_check()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'extensions'
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.id = auth.uid() OR public.has_role(auth.uid(), 'admin');
$$;

-- Update functions that might have trigger security issues
CREATE OR REPLACE FUNCTION public.safe_update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;