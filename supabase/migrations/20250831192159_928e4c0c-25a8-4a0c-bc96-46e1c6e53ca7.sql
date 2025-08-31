-- Brand terms protection and ignore lists
CREATE TABLE IF NOT EXISTS public.brand_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  term text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, term)
);

CREATE TABLE IF NOT EXISTS public.st_ignore_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  search_term text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  campaign_id text,
  ad_group_id text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS st_ignore_idx ON public.st_ignore_list(profile_id, search_term);

-- Current negatives snapshot for reference
CREATE TABLE IF NOT EXISTS public.negatives_snapshot (
  profile_id text NOT NULL,
  scope text NOT NULL,
  campaign_id text,
  ad_group_id text,
  negative_type text NOT NULL,
  match_type text,
  value text NOT NULL,
  state text,
  last_seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, scope, COALESCE(campaign_id,''), COALESCE(ad_group_id,''), negative_type, COALESCE(match_type,''), value)
);

-- Read-optimized view for Search-Term Studio
CREATE OR REPLACE VIEW public.v_studio_search_terms AS
WITH metrics AS (
  SELECT
    date, profile_id, campaign_id, ad_group_id, search_term,
    SUM(clicks)::bigint AS clicks,
    SUM(impressions)::bigint AS impressions,
    SUM(cost_micros)::bigint AS cost_micros,
    SUM(attributed_conversions_7d)::bigint AS conv,
    SUM(attributed_sales_7d_micros)::bigint AS sales_micros
  FROM fact_search_term_daily
  GROUP BY 1,2,3,4,5
),
roll AS (
  SELECT
    profile_id, campaign_id, ad_group_id, search_term,
    SUM(clicks)::bigint AS clicks_14d,
    SUM(impressions)::bigint AS impressions_14d,
    SUM(cost_micros)::bigint AS cost_14d_micros,
    SUM(conv)::bigint AS conv_14d,
    SUM(sales_micros)::bigint AS sales_14d_micros
  FROM metrics
  WHERE date >= current_date - 14
  GROUP BY 1,2,3,4
),
flags AS (
  SELECT
    r.*,
    (CASE WHEN bt.term IS NOT NULL THEN true ELSE false END) AS is_brand,
    (CASE WHEN ig.id IS NOT NULL THEN true ELSE false END) AS is_ignored
  FROM roll r
  LEFT JOIN brand_terms bt
    ON bt.profile_id = r.profile_id AND r.search_term ILIKE '%' || bt.term || '%'
  LEFT JOIN st_ignore_list ig
    ON ig.profile_id = r.profile_id AND ig.search_term ILIKE r.search_term
)
SELECT
  f.profile_id, f.campaign_id, f.ad_group_id, f.search_term,
  f.clicks_14d, f.impressions_14d, f.cost_14d_micros, f.conv_14d, f.sales_14d_micros,
  (f.cost_14d_micros/1e6)::numeric AS spend_14d,
  NULLIF(f.sales_14d_micros/1e6,0)::numeric AS sales_14d,
  CASE WHEN f.sales_14d_micros > 0 THEN (f.cost_14d_micros::numeric/f.sales_14d_micros) ELSE null END AS acos_14d,
  CASE WHEN f.impressions_14d > 0 THEN (f.clicks_14d::numeric/f.impressions_14d) ELSE null END AS ctr_14d,
  CASE WHEN f.clicks_14d > 0 THEN (f.conv_14d::numeric/f.clicks_14d) ELSE null END AS cvr_14d,
  f.is_brand, f.is_ignored
FROM flags f;

-- RLS policies for new tables
ALTER TABLE public.brand_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.st_ignore_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negatives_snapshot ENABLE ROW LEVEL SECURITY;

-- Brand terms policies
CREATE POLICY "Users can manage their brand terms" ON public.brand_terms
FOR ALL USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = brand_terms.profile_id 
  AND ac.user_id = auth.uid()
));

-- Ignore list policies  
CREATE POLICY "Users can manage their ignore list" ON public.st_ignore_list
FOR ALL USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = st_ignore_list.profile_id 
  AND ac.user_id = auth.uid()
));

-- Negatives snapshot policies
CREATE POLICY "Users can view their negatives snapshot" ON public.negatives_snapshot
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = negatives_snapshot.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage negatives snapshot" ON public.negatives_snapshot
FOR ALL USING (auth.role() = 'service_role');

-- Add search term data to fact table if missing (placeholder for existing structure)
CREATE TABLE IF NOT EXISTS public.fact_search_term_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  search_term text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_7d integer DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, profile_id, campaign_id, ad_group_id, search_term)
);

ALTER TABLE public.fact_search_term_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their search term data" ON public.fact_search_term_daily
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_search_term_daily.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage search term data" ON public.fact_search_term_daily
FOR ALL USING (auth.role() = 'service_role');