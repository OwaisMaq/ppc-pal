-- Fix unique constraints to use correct column names
-- Drop the incorrect constraints
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_id_connection_id_key;
ALTER TABLE public.ad_groups DROP CONSTRAINT IF EXISTS ad_groups_adgroup_id_connection_id_key;

-- Add correct constraints
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_amazon_campaign_id_connection_id_key UNIQUE (amazon_campaign_id, connection_id);
ALTER TABLE public.ad_groups ADD CONSTRAINT ad_groups_amazon_adgroup_id_connection_id_key UNIQUE (amazon_adgroup_id, connection_id);