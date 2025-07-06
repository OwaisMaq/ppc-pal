
-- Add missing foreign key constraint for campaigns table
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_connection_id_fkey 
FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

-- Add missing foreign key constraint for ad_groups table  
ALTER TABLE public.ad_groups 
ADD CONSTRAINT ad_groups_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Add missing foreign key constraint for keywords table
ALTER TABLE public.keywords 
ADD CONSTRAINT keywords_adgroup_id_fkey 
FOREIGN KEY (adgroup_id) REFERENCES public.ad_groups(id) ON DELETE CASCADE;
