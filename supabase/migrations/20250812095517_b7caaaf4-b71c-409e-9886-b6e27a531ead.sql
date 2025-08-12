
-- Allow only safe, column-level SELECT on amazon_connections for authenticated role
-- This lets RLS policies on related tables evaluate without exposing tokens.

-- Remove any blanket SELECT grant (defense in depth)
REVOKE SELECT ON public.amazon_connections FROM authenticated;

-- Grant SELECT on only non-sensitive columns (no access_token / refresh_token)
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

-- Extra safety (redundant given the column list above, but explicit):
REVOKE SELECT (access_token, refresh_token) ON public.amazon_connections FROM authenticated;
