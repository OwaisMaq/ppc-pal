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