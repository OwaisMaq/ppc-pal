-- Grant execute permissions on rollup function
GRANT EXECUTE ON FUNCTION public.rollup_campaign_aggregates_14d(uuid) TO authenticated, service_role;