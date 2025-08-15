-- Grant execute permissions on rollup function to ensure it works with any client
GRANT EXECUTE ON FUNCTION public.rollup_campaign_aggregates_14d(uuid) TO authenticated, service_role;