-- Create function to extract ASIN from campaign name using regex
CREATE OR REPLACE FUNCTION public.extract_asin_from_name(campaign_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    -- Look for pattern like "SP_Product_B0XXXXXX_..." or "SB_Product_B0XXXXXX_..."
    WHEN campaign_name ~ '[_\s]B0[A-Z0-9]{8}[_\s]' THEN
      substring(campaign_name from '[_\s](B0[A-Z0-9]{8})[_\s]') 
    -- Look for standalone ASIN at end or middle with underscores
    WHEN campaign_name ~ '[_\s]B0[A-Z0-9]{8}$' THEN
      substring(campaign_name from '[_\s](B0[A-Z0-9]{8})$')
    -- Look for ASIN pattern anywhere in the name
    WHEN campaign_name ~ 'B0[A-Z0-9]{8}' THEN
      substring(campaign_name from '(B0[A-Z0-9]{8})')
    ELSE NULL
  END;
$$;

-- Update campaigns table with extracted ASINs where ASIN is currently null
UPDATE public.campaigns 
SET asin = public.extract_asin_from_name(name)
WHERE asin IS NULL AND public.extract_asin_from_name(name) IS NOT NULL;

-- Update keywords table with ASINs from their campaigns where ASIN is currently null
UPDATE public.keywords k
SET asin = c.asin
FROM public.campaigns c
JOIN public.ad_groups ag ON c.id = ag.campaign_id
WHERE k.adgroup_id = ag.id 
AND k.asin IS NULL 
AND c.asin IS NOT NULL;

-- Update targets table with ASINs from their campaigns where ASIN is currently null  
UPDATE public.targets t
SET asin = c.asin
FROM public.campaigns c
JOIN public.ad_groups ag ON c.id = ag.campaign_id
WHERE t.adgroup_id = ag.id 
AND t.asin IS NULL 
AND c.asin IS NOT NULL;