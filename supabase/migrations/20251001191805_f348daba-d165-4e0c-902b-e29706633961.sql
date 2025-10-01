-- Add updated_at to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to auto-update campaigns.updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON public.campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint to ad_groups on amazon_adgroup_id to support ON CONFLICT upserts
ALTER TABLE public.ad_groups 
DROP CONSTRAINT IF EXISTS ad_groups_amazon_adgroup_id_key;

ALTER TABLE public.ad_groups 
ADD CONSTRAINT ad_groups_amazon_adgroup_id_key 
UNIQUE (amazon_adgroup_id);

-- Add unique constraint to keywords on amazon_keyword_id to support ON CONFLICT upserts
ALTER TABLE public.keywords 
DROP CONSTRAINT IF EXISTS keywords_amazon_keyword_id_key;

ALTER TABLE public.keywords 
ADD CONSTRAINT keywords_amazon_keyword_id_key 
UNIQUE (amazon_keyword_id);

-- Force PostgREST schema cache reload
COMMENT ON TABLE public.campaigns IS 'Campaign entities - schema updated 2025-10-01T19:16:00Z';