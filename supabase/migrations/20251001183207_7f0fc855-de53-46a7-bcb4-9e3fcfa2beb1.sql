-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS placement_bidding jsonb DEFAULT NULL;

-- Add updated_at to ad_groups if not exists
ALTER TABLE public.ad_groups 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add updated_at to keywords if not exists  
ALTER TABLE public.keywords 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create triggers to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for ad_groups
DROP TRIGGER IF EXISTS update_ad_groups_updated_at ON public.ad_groups;
CREATE TRIGGER update_ad_groups_updated_at 
    BEFORE UPDATE ON public.ad_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for keywords
DROP TRIGGER IF EXISTS update_keywords_updated_at ON public.keywords;
CREATE TRIGGER update_keywords_updated_at 
    BEFORE UPDATE ON public.keywords 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Force schema reload
COMMENT ON TABLE public.campaigns IS 'Campaign entities with placement_bidding support - updated 2025-10-01T18:31:00Z';