
-- Remove Amazon-related tables and their dependencies
DROP TABLE IF EXISTS public.keywords CASCADE;
DROP TABLE IF EXISTS public.ad_groups CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.campaign_metrics_history CASCADE;
DROP TABLE IF EXISTS public.amazon_connections CASCADE;
DROP TABLE IF EXISTS public.automation_preferences CASCADE;
DROP TABLE IF EXISTS public.optimization_results CASCADE;
DROP TABLE IF EXISTS public.optimization_recommendations CASCADE;

-- Remove Amazon-related functions
DROP FUNCTION IF EXISTS public.sync_amazon_data(uuid);
DROP FUNCTION IF EXISTS public.create_optimization_batch(uuid, uuid);

-- Remove custom types that were used for Amazon functionality
DROP TYPE IF EXISTS public.campaign_status CASCADE;
DROP TYPE IF EXISTS public.api_connection_status CASCADE;
DROP TYPE IF EXISTS public.optimization_status CASCADE;
