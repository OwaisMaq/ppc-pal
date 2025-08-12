
-- 1) Ensure the client-facing view is safe and invoker-based (RLS applies for caller)
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

-- 2) Grant read-only access to the safe view for authenticated users
GRANT SELECT ON public.amazon_connections_client TO authenticated;

-- 3) Explicitly block clients from reading token columns on the base table
REVOKE SELECT (access_token, refresh_token) ON public.amazon_connections FROM authenticated;

-- 4) Allow SELECT only on non-sensitive columns needed by the view
GRANT SELECT (
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
) ON public.amazon_connections TO authenticated;

-- 5) Block client-side writes to amazon_connections (writes happen via Edge Functions with service_role)
REVOKE INSERT ON public.amazon_connections FROM authenticated;
REVOKE UPDATE ON public.amazon_connections FROM authenticated;
-- Extra explicit safety (redundant given REVOKE UPDATE above):
REVOKE UPDATE (access_token, refresh_token) ON public.amazon_connections FROM authenticated;

-- 6) Ensure delete remains possible for owners (RLS already restricts to owner rows)
GRANT DELETE ON public.amazon_connections TO authenticated;
