
-- 1) Defense in depth: ensure no direct table access for anon/authenticated
REVOKE ALL ON TABLE public.amazon_connections FROM anon, authenticated;

-- 2) Make the existing safe view run as SECURITY INVOKER (so RLS applies for the caller)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'amazon_connections_safe'
  ) THEN
    -- Create it if it doesn't exist yet (without tokens)
    CREATE VIEW public.amazon_connections_safe
    WITH (security_invoker = on)
    AS
    SELECT
      id,
      user_id,
      profile_id,
      profile_name,
      marketplace_id,
      token_expires_at,
      status,
      last_sync_at,
      created_at,
      updated_at,
      campaign_count,
      advertising_api_endpoint,
      reporting_api_version,
      supported_attribution_models,
      health_status,
      health_issues,
      last_health_check,
      setup_required_reason
    FROM public.amazon_connections;
  ELSE
    -- If it exists, ensure it uses SECURITY INVOKER
    ALTER VIEW public.amazon_connections_safe
      SET (security_invoker = on);
  END IF;
END
$$;

-- 3) Create the client-facing view that your frontend already references,
--    explicitly marking it SECURITY INVOKER and excluding sensitive columns.
CREATE OR REPLACE VIEW public.amazon_connections_client
WITH (security_invoker = on)
AS
SELECT
  id,
  user_id,
  profile_id,
  profile_name,
  marketplace_id,
  token_expires_at,
  status,
  last_sync_at,
  created_at,
  updated_at,
  campaign_count,
  advertising_api_endpoint,
  reporting_api_version,
  supported_attribution_models,
  health_status,
  health_issues,
  last_health_check,
  setup_required_reason
FROM public.amazon_connections;

-- 4) Allow only authenticated users to select from the client view
GRANT SELECT ON public.amazon_connections_client TO authenticated;
