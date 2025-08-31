-- Phase 5: Dashboard views and indexes for performance data (Fixed)

-- Create read-optimized campaign daily view
CREATE OR REPLACE VIEW v_campaign_daily AS
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
  -- SP hourly facts aggregated to daily
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
  
  -- SB hourly facts aggregated to daily  
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
  
  -- SD hourly facts aggregated to daily
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

-- Create ad group daily view
CREATE OR REPLACE VIEW v_ad_group_daily AS
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
WHERE EXISTS (
  SELECT 1 FROM amazon_connections ac WHERE ac.profile_id = ag.profile_id
)
GROUP BY 1,2,3,4,5;

-- Create target daily view
CREATE OR REPLACE VIEW v_target_daily AS
SELECT 
  d.date,
  t.profile_id,
  t.campaign_id,
  t.ad_group_id,
  t.target_id,
  t.match_type,
  t.expression,
  COALESCE(SUM(f.clicks), 0)::bigint as clicks,
  COALESCE(SUM(f.impressions), 0)::bigint as impressions,
  COALESCE(SUM(f.cost_micros), 0)::bigint as cost_micros,
  COALESCE(SUM(f.attributed_conversions_7d), 0)::bigint as conv_7d,
  COALESCE(SUM(f.attributed_sales_7d_micros), 0)::bigint as sales_7d_micros
FROM entity_targets t
CROSS JOIN generate_series(current_date - interval '90 days', current_date, interval '1 day') as d(date)
LEFT JOIN (
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    target_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sp_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4,5
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    target_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sb_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4,5
  
  UNION ALL
  
  SELECT 
    date_trunc('day', hour) as date,
    profile_id,
    campaign_id,
    ad_group_id,
    target_id,
    SUM(clicks) as clicks,
    SUM(impressions) as impressions,
    SUM(cost_micros) as cost_micros,
    SUM(attributed_conversions_1d) as attributed_conversions_7d,
    SUM(attributed_sales_1d_micros) as attributed_sales_7d_micros
  FROM fact_sd_hourly
  WHERE hour >= current_date - interval '90 days'
  GROUP BY 1,2,3,4,5
) f ON f.profile_id = t.profile_id AND f.campaign_id = t.campaign_id AND f.ad_group_id = t.ad_group_id AND f.target_id = t.target_id AND f.date = d.date
WHERE EXISTS (
  SELECT 1 FROM amazon_connections ac WHERE ac.profile_id = t.profile_id
)
GROUP BY 1,2,3,4,5,6,7;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_fact_sp_hourly_profile_date ON fact_sp_hourly (profile_id, date_trunc('day', hour));
CREATE INDEX IF NOT EXISTS idx_fact_sb_hourly_profile_date ON fact_sb_hourly (profile_id, date_trunc('day', hour));
CREATE INDEX IF NOT EXISTS idx_fact_sd_hourly_profile_date ON fact_sd_hourly (profile_id, date_trunc('day', hour));

CREATE INDEX IF NOT EXISTS idx_fact_sp_hourly_campaign_date ON fact_sp_hourly (campaign_id, date_trunc('day', hour));
CREATE INDEX IF NOT EXISTS idx_fact_sb_hourly_campaign_date ON fact_sb_hourly (campaign_id, date_trunc('day', hour));
CREATE INDEX IF NOT EXISTS idx_fact_sd_hourly_campaign_date ON fact_sd_hourly (campaign_id, date_trunc('day', hour));