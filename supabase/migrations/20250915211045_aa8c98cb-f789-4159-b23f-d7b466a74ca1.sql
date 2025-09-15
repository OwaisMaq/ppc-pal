-- Add missing columns to fact_search_term_daily for search terms sync
ALTER TABLE public.fact_search_term_daily 
ADD COLUMN IF NOT EXISTS keyword_id TEXT,
ADD COLUMN IF NOT EXISTS search_term TEXT,
ADD COLUMN IF NOT EXISTS match_type TEXT,
ADD COLUMN IF NOT EXISTS targeting TEXT;

-- Create unique index for upserts (drop existing if needed)
DROP INDEX IF EXISTS idx_fact_search_term_daily_unique;
CREATE UNIQUE INDEX idx_fact_search_term_daily_unique 
ON public.fact_search_term_daily (profile_id, campaign_id, ad_group_id, COALESCE(keyword_id, ''), COALESCE(search_term, ''), date);

-- Create or update the v_studio_search_terms view to use fact table
DROP VIEW IF EXISTS public.v_studio_search_terms;
CREATE VIEW public.v_studio_search_terms AS
SELECT 
  f.profile_id,
  f.campaign_id,
  f.ad_group_id,
  f.keyword_id,
  f.search_term,
  SUM(f.clicks) AS clicks_14d,
  SUM(f.impressions) AS impressions_14d,
  SUM(f.cost_micros) AS cost_14d_micros,
  SUM(f.attributed_conversions_7d) AS conv_14d,
  SUM(f.attributed_sales_7d_micros) AS sales_14d_micros,
  ROUND(SUM(f.cost_micros)::numeric / 1000000, 2) AS spend_14d,
  ROUND(SUM(f.attributed_sales_7d_micros)::numeric / 1000000, 2) AS sales_14d,
  CASE 
    WHEN SUM(f.attributed_sales_7d_micros) > 0 THEN 
      ROUND((SUM(f.cost_micros)::numeric / SUM(f.attributed_sales_7d_micros)) * 100, 2)
    ELSE NULL
  END AS acos_14d,
  CASE 
    WHEN SUM(f.impressions) > 0 THEN 
      ROUND((SUM(f.clicks)::numeric / SUM(f.impressions)) * 100, 2)
    ELSE NULL
  END AS ctr_14d,
  CASE 
    WHEN SUM(f.clicks) > 0 THEN 
      ROUND((SUM(f.attributed_conversions_7d)::numeric / SUM(f.clicks)) * 100, 2)
    ELSE NULL
  END AS cvr_14d,
  -- Brand classification logic
  EXISTS (SELECT 1 FROM brand_terms bt WHERE bt.profile_id = f.profile_id AND LOWER(f.search_term) ILIKE '%' || LOWER(bt.term) || '%') AS is_brand,
  false AS is_ignored -- Default to false, can be updated via application logic
FROM public.fact_search_term_daily f
WHERE f.date >= CURRENT_DATE - INTERVAL '14 days'
  AND f.search_term IS NOT NULL
GROUP BY f.profile_id, f.campaign_id, f.ad_group_id, f.keyword_id, f.search_term;