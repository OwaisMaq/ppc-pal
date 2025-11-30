-- Fix v_campaign_daily view to use profile_id JOIN for multi-user access
-- Must also recreate dependent view v_campaign_daily_fx

-- Drop dependent views first
DROP VIEW IF EXISTS v_campaign_daily_fx CASCADE;
DROP VIEW IF EXISTS v_campaign_daily CASCADE;

-- Recreate v_campaign_daily with profile_id JOIN
CREATE VIEW v_campaign_daily WITH (security_invoker = on) AS
SELECT 
    d.date,
    c.profile_id,
    c.amazon_campaign_id AS campaign_id,
    c.name AS campaign_name,
    c.campaign_type,
    COALESCE(sum(f.clicks), 0)::bigint AS clicks,
    COALESCE(sum(f.impressions), 0)::bigint AS impressions,
    COALESCE(sum(f.cost_micros), 0)::bigint AS cost_micros,
    COALESCE(sum(f.attributed_conversions_7d), 0)::bigint AS conv_7d,
    COALESCE(sum(f.attributed_sales_7d_micros), 0)::bigint AS sales_7d_micros
FROM campaigns c
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE::timestamp,
    INTERVAL '1 day'
) d(date)
LEFT JOIN (
    SELECT date_trunc('day', hour) AS date,
           profile_id,
           campaign_id,
           ad_group_id,
           sum(clicks) AS clicks,
           sum(impressions) AS impressions,
           sum(cost_micros) AS cost_micros,
           sum(attributed_conversions_1d) AS attributed_conversions_7d,
           sum(attributed_sales_1d_micros) AS attributed_sales_7d_micros
    FROM fact_sp_hourly
    WHERE hour >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY date_trunc('day', hour), profile_id, campaign_id, ad_group_id
    UNION ALL
    SELECT date_trunc('day', hour) AS date,
           profile_id,
           campaign_id,
           ad_group_id,
           sum(clicks) AS clicks,
           sum(impressions) AS impressions,
           sum(cost_micros) AS cost_micros,
           sum(attributed_conversions_1d) AS attributed_conversions_7d,
           sum(attributed_sales_1d_micros) AS attributed_sales_7d_micros
    FROM fact_sb_hourly
    WHERE hour >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY date_trunc('day', hour), profile_id, campaign_id, ad_group_id
    UNION ALL
    SELECT date_trunc('day', hour) AS date,
           profile_id,
           campaign_id,
           ad_group_id,
           sum(clicks) AS clicks,
           sum(impressions) AS impressions,
           sum(cost_micros) AS cost_micros,
           sum(attributed_conversions_1d) AS attributed_conversions_7d,
           sum(attributed_sales_1d_micros) AS attributed_sales_7d_micros
    FROM fact_sd_hourly
    WHERE hour >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY date_trunc('day', hour), profile_id, campaign_id, ad_group_id
) f ON f.profile_id = c.profile_id 
   AND f.campaign_id = c.amazon_campaign_id 
   AND f.date = d.date
GROUP BY d.date, c.profile_id, c.amazon_campaign_id, c.name, c.campaign_type;

-- Recreate v_campaign_daily_fx (dependent view with FX conversions)
CREATE OR REPLACE VIEW v_campaign_daily_fx AS
SELECT
  f.date, 
  f.profile_id, 
  f.campaign_id,
  f.clicks,
  f.impressions,
  f.cost_micros,
  f.sales_7d_micros,
  f.conv_7d AS orders_7d,
  -- Convert to base currency using FX rates
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'GBP'), 1.0) as spend_gbp,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'GBP'), 1.0) as sales_gbp,
  -- Also provide USD conversion
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'USD'), 1.0) as spend_usd,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'USD'), 1.0) as sales_usd,
  -- And EUR conversion
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'EUR'), 1.0) as spend_eur,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date::date, pc.currency, 'EUR'), 1.0) as sales_eur,
  -- Include currency info
  pc.currency as profile_currency
FROM v_campaign_daily f
LEFT JOIN profile_currency pc ON pc.profile_id = f.profile_id;