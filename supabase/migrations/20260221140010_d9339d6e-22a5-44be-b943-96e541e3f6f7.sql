-- Revoke full SELECT on amazon_connections from authenticated users
-- Then grant SELECT only on non-sensitive columns
REVOKE SELECT ON public.amazon_connections FROM authenticated;
REVOKE SELECT ON public.amazon_connections FROM anon;

-- Grant SELECT on specific non-sensitive columns only
GRANT SELECT (
  id, user_id, profile_id, profile_name, marketplace_id,
  token_expires_at, status, last_sync_at, created_at, updated_at,
  campaign_count, advertising_api_endpoint, reporting_api_version,
  supported_attribution_models, health_status, health_issues,
  last_health_check, setup_required_reason, is_managed,
  streams_configured, streams_destination_arn, streams_region
) ON public.amazon_connections TO authenticated;

-- Keep INSERT, UPDATE, DELETE on the base table for authenticated users
-- (these are already governed by RLS policies)