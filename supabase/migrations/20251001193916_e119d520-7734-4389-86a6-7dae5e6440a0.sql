-- Add missing unique constraints for upsert operations

-- Drop any incorrect constraints from previous migration
ALTER TABLE public.ad_groups 
DROP CONSTRAINT IF EXISTS ad_groups_amazon_adgroup_id_key;

ALTER TABLE public.keywords 
DROP CONSTRAINT IF EXISTS keywords_amazon_keyword_id_key;

-- Add correct unique constraints that match sync function expectations
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_campaign_id_connection_id_key;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_campaign_id_connection_id_key 
UNIQUE (campaign_id, connection_id);

ALTER TABLE public.ad_groups
DROP CONSTRAINT IF EXISTS ad_groups_adgroup_id_connection_id_key;

ALTER TABLE public.ad_groups  
ADD CONSTRAINT ad_groups_adgroup_id_connection_id_key
UNIQUE (adgroup_id, connection_id);

-- Force PostgREST schema cache reload
COMMENT ON TABLE public.campaigns IS 'Campaign entities with sync-compatible constraints - updated 2025-10-01T19:35:00Z';