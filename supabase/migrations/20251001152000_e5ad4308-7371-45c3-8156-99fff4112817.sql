-- Add adgroup_id text column to match campaign_id pattern
ALTER TABLE public.ad_groups 
ADD COLUMN IF NOT EXISTS adgroup_id text UNIQUE;

-- Populate it from amazon_adgroup_id
UPDATE public.ad_groups 
SET adgroup_id = amazon_adgroup_id 
WHERE adgroup_id IS NULL;