-- Ensure all required tables and columns exist for Amazon Ads API integration

-- Update campaigns table to ensure all required columns exist
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS amazon_campaign_id text,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS campaign_type text,
ADD COLUMN IF NOT EXISTS targeting_type text,
ADD COLUMN IF NOT EXISTS daily_budget numeric,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Add unique constraint for amazon_campaign_id per connection
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_connection_amazon_campaign_unique;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_connection_amazon_campaign_unique 
UNIQUE (connection_id, amazon_campaign_id);

-- Update ad_groups table to ensure all required columns exist
ALTER TABLE public.ad_groups 
ADD COLUMN IF NOT EXISTS amazon_adgroup_id text,
ADD COLUMN IF NOT EXISTS name text;

-- Add unique constraint for amazon_adgroup_id per campaign
ALTER TABLE public.ad_groups 
DROP CONSTRAINT IF EXISTS ad_groups_campaign_amazon_adgroup_unique;

ALTER TABLE public.ad_groups 
ADD CONSTRAINT ad_groups_campaign_amazon_adgroup_unique 
UNIQUE (campaign_id, amazon_adgroup_id);

-- Update amazon_connections table to ensure all required columns exist
ALTER TABLE public.amazon_connections 
ADD COLUMN IF NOT EXISTS profile_id text,
ADD COLUMN IF NOT EXISTS profile_name text,
ADD COLUMN IF NOT EXISTS marketplace_id text,
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS refresh_token text,
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS campaign_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_required_reason text;

-- Ensure required columns are not null where needed
UPDATE public.campaigns SET amazon_campaign_id = 'unknown' WHERE amazon_campaign_id IS NULL;
UPDATE public.campaigns SET name = 'Unknown Campaign' WHERE name IS NULL;
ALTER TABLE public.campaigns ALTER COLUMN amazon_campaign_id SET NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN name SET NOT NULL;

UPDATE public.ad_groups SET amazon_adgroup_id = 'unknown' WHERE amazon_adgroup_id IS NULL;
UPDATE public.ad_groups SET name = 'Unknown Ad Group' WHERE name IS NULL;
ALTER TABLE public.ad_groups ALTER COLUMN amazon_adgroup_id SET NOT NULL;
ALTER TABLE public.ad_groups ALTER COLUMN name SET NOT NULL;

UPDATE public.amazon_connections SET profile_id = 'unknown' WHERE profile_id IS NULL;
UPDATE public.amazon_connections SET access_token = 'unknown' WHERE access_token IS NULL;
UPDATE public.amazon_connections SET refresh_token = 'unknown' WHERE refresh_token IS NULL;
UPDATE public.amazon_connections SET token_expires_at = now() + interval '1 hour' WHERE token_expires_at IS NULL;
ALTER TABLE public.amazon_connections ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE public.amazon_connections ALTER COLUMN access_token SET NOT NULL;
ALTER TABLE public.amazon_connections ALTER COLUMN refresh_token SET NOT NULL;
ALTER TABLE public.amazon_connections ALTER COLUMN token_expires_at SET NOT NULL;