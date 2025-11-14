-- Drop and recreate the remaining 6 views with security_invoker to fix SECURITY DEFINER issues
-- This is needed because CREATE OR REPLACE VIEW doesn't always update the security options

-- Drop the views first (in correct order to handle dependencies)
DROP VIEW IF EXISTS v_campaign_daily_fx CASCADE;
DROP VIEW IF EXISTS v_studio_search_terms CASCADE;
DROP VIEW IF EXISTS v_ad_group_daily CASCADE;
DROP VIEW IF EXISTS v_campaign_daily CASCADE;
DROP VIEW IF EXISTS v_target_daily CASCADE;
DROP VIEW IF EXISTS v_attribution_campaign CASCADE;
DROP VIEW IF EXISTS v_creative_kpis CASCADE;

-- Recreate v_campaign_daily with security_invoker
CREATE VIEW v_campaign_daily
WITH (security_invoker = on)
AS
SELECT 
  d.date,
  ac.profile_id,
  c.amazon_campaign_id as campaign_id,
  c.name as campaign_name,
  c.campaign_type,
  COALESCE(SUM(f.clicks), 0)::bigint as clicks,
  COALESCE(SUM(f.impressions), 0)::bigint as impressions,
  COALESCE(SUM(f.cost_micros), 0)::bigint as cost_micros,
  COALESCE(SUM(f.attributed_conversions_7d), 0)::bigint as conv_7d,
  COALESCE(SUM(f.attributed_sales_7d_micros), 0)::bigint as sales_7d_micros
FROM campaigns c
JOIN amazon_connections ac ON c.connection_id = ac.id
CROSS JOIN generate_series(current_date - interval '90 days', current_date, interval '1 day') as d(date)
LEFT JOIN (
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sp_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sb_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sd_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
) f ON f.profile_id = ac.profile_id AND f.campaign_id = c.amazon_campaign_id AND f.date = d.date
GROUP BY 1,2,3,4,5;

-- Recreate v_ad_group_daily with security_invoker
CREATE VIEW v_ad_group_daily
WITH (security_invoker = on)
AS
SELECT 
  d.date,
  ag.profile_id,
  ag.campaign_id,
  ag.ad_group_id,
  ag.name as ad_group_name,
  COALESCE(SUM(f.clicks), 0)::bigint as clicks,
  COALESCE(SUM(f.impressions), 0)::bigint as impressions,
  COALESCE(SUM(f.cost_micros), 0)::bigint as cost_micros,
  COALESCE(SUM(f.attributed_conversions_7d), 0)::bigint as conv_7d,
  COALESCE(SUM(f.attributed_sales_7d_micros), 0)::bigint as sales_7d_micros
FROM entity_ad_groups ag
CROSS JOIN generate_series(current_date - interval '90 days', current_date, interval '1 day') as d(date)
LEFT JOIN (
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sp_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sb_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sd_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4
) f ON f.profile_id = ag.profile_id AND f.campaign_id = ag.campaign_id AND f.ad_group_id = ag.ad_group_id AND f.date = d.date
WHERE EXISTS (SELECT 1 FROM amazon_connections ac WHERE ac.profile_id = ag.profile_id)
GROUP BY 1,2,3,4,5;

-- Recreate v_target_daily with security_invoker
CREATE VIEW v_target_daily
WITH (security_invoker = on)
AS
SELECT 
  date,
  profile_id,
  campaign_id,
  ad_group_id,
  target_id,
  target_type,
  SUM(clicks) as clicks,
  SUM(impressions) as impressions,
  SUM(cost_micros) as cost_micros,
  SUM(attributed_conversions_7d) as conv_7d,
  SUM(attributed_sales_7d_micros) as sales_7d_micros
FROM fact_target_daily
WHERE date >= current_date - interval '90 days'
GROUP BY 1,2,3,4,5,6;

-- Recreate v_studio_search_terms with security_invoker
CREATE VIEW public.v_studio_search_terms
WITH (security_invoker = on)
AS
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
  EXISTS (SELECT 1 FROM brand_terms bt WHERE bt.profile_id = f.profile_id AND LOWER(f.search_term) ILIKE '%' || LOWER(bt.term) || '%') AS is_brand,
  false AS is_ignored
FROM public.fact_search_term_daily f
WHERE f.date >= CURRENT_DATE - INTERVAL '14 days'
  AND f.search_term IS NOT NULL
GROUP BY f.profile_id, f.campaign_id, f.ad_group_id, f.keyword_id, f.search_term;

-- Recreate v_attribution_campaign with security_invoker
CREATE VIEW v_attribution_campaign
WITH (security_invoker = on)
AS
SELECT 
  profile_id,
  campaign_id,
  SUM(sales_weighted_micros) AS sales_attr_micros,
  SUM(conversions_weighted) AS conv_attr
FROM attribution_results r
WHERE level = 'campaign' AND campaign_id <> ''
GROUP BY profile_id, campaign_id;

-- Recreate v_creative_kpis with security_invoker
CREATE VIEW v_creative_kpis
WITH (security_invoker = on)
AS
SELECT 
  cpd.profile_id,
  cpd.campaign_id,
  cpd.ad_id,
  cpd.asset_id,
  SUM(cpd.clicks) AS clicks_30d,
  SUM(cpd.impressions) AS impressions_30d,
  SUM(cpd.cost_micros) AS cost_30d_micros,
  SUM(cpd.conversions_7d) AS conv_30d,
  SUM(cpd.sales_7d_micros) AS sales_30d_micros,
  SUM(cpd.video_completes) AS video_completes_30d,
  CASE WHEN SUM(cpd.video_starts) > 0 THEN ROUND((SUM(cpd.video_completes)::numeric / SUM(cpd.video_starts)) * 100, 2) ELSE NULL END AS vcr_30d
FROM creative_performance_daily cpd
WHERE cpd.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cpd.profile_id, cpd.campaign_id, cpd.ad_id, cpd.asset_id;

-- Recreate v_campaign_daily_fx with security_invoker (depends on v_campaign_daily)
CREATE VIEW v_campaign_daily_fx
WITH (security_invoker = on)
AS
SELECT 
  f.date,
  f.profile_id,
  f.campaign_id,
  f.clicks,
  f.impressions,
  f.cost_micros,
  f.sales_7d_micros,
  f.conv_7d,
  (f.cost_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'GBP'), 1.0) as spend_gbp,
  (f.sales_7d_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'GBP'), 1.0) as sales_gbp,
  (f.cost_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'USD'), 1.0) as spend_usd,
  (f.sales_7d_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'USD'), 1.0) as sales_usd,
  (f.cost_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'EUR'), 1.0) as spend_eur,
  (f.sales_7d_micros::numeric / 1000000.0) * COALESCE(fx_rate(f.date::date, COALESCE(pc.currency, 'USD'), 'EUR'), 1.0) as sales_eur,
  COALESCE(pc.currency, 'USD') as profile_currency
FROM v_campaign_daily f
LEFT JOIN profile_currency pc ON pc.profile_id = f.profile_id;