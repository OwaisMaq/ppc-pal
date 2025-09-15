-- Ensure fact_search_term_daily table exists with correct structure for search terms
CREATE TABLE IF NOT EXISTS public.fact_search_term_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  keyword_id TEXT,
  search_term TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  attributed_conversions_7d INTEGER DEFAULT 0,
  attributed_sales_7d_micros BIGINT DEFAULT 0,
  attributed_conversions_1d INTEGER DEFAULT 0,
  match_type TEXT,
  targeting TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fact_search_term_daily ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view search term facts for their profiles" 
ON public.fact_search_term_daily 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_search_term_daily.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage search term facts" 
ON public.fact_search_term_daily 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Create unique index for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_fact_search_term_daily_unique 
ON public.fact_search_term_daily (profile_id, campaign_id, ad_group_id, keyword_id, search_term, date);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fact_search_term_daily_profile_date 
ON public.fact_search_term_daily (profile_id, date);

CREATE INDEX IF NOT EXISTS idx_fact_search_term_daily_search_term 
ON public.fact_search_term_daily (search_term);

-- Create or update the v_studio_search_terms view to use fact table
CREATE OR REPLACE VIEW public.v_studio_search_terms AS
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
GROUP BY f.profile_id, f.campaign_id, f.ad_group_id, f.keyword_id, f.search_term;