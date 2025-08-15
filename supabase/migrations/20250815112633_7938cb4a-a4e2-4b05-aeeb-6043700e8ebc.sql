-- Add ASIN support to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN asin TEXT;

-- Add ASIN support to targets table (for product targeting)
ALTER TABLE public.targets 
ADD COLUMN asin TEXT;

-- Add ASIN support to keywords table (for ASIN-specific keywords)
ALTER TABLE public.keywords 
ADD COLUMN asin TEXT;

-- Create an index for better performance when filtering by ASIN
CREATE INDEX idx_campaigns_asin ON public.campaigns(asin) WHERE asin IS NOT NULL;
CREATE INDEX idx_targets_asin ON public.targets(asin) WHERE asin IS NOT NULL;
CREATE INDEX idx_keywords_asin ON public.keywords(asin) WHERE asin IS NOT NULL;

-- Add a comment to document the ASIN fields
COMMENT ON COLUMN public.campaigns.asin IS 'Amazon Standard Identification Number for the product being advertised';
COMMENT ON COLUMN public.targets.asin IS 'Target ASIN for product targeting campaigns';
COMMENT ON COLUMN public.keywords.asin IS 'Associated ASIN for keyword targeting';