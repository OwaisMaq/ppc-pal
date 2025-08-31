-- Add the FX normalized view for campaign daily data
CREATE OR REPLACE VIEW v_campaign_daily_fx AS
SELECT
  f.date, 
  f.profile_id, 
  f.campaign_id,
  f.clicks,
  f.impressions,
  f.cost_micros,
  f.sales_7d_micros,
  f.orders_7d,
  -- Convert to base currency using FX rates
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'GBP'), 1.0) as spend_gbp,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'GBP'), 1.0) as sales_gbp,
  -- Also provide USD conversion
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'USD'), 1.0) as spend_usd,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'USD'), 1.0) as sales_usd,
  -- And EUR conversion
  (f.cost_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'EUR'), 1.0) as spend_eur,
  (f.sales_7d_micros / 1000000.0) * COALESCE(fx_rate(f.date, COALESCE(pc.currency, 'USD'), 'EUR'), 1.0) as sales_eur,
  -- Include currency info
  COALESCE(pc.currency, 'USD') as profile_currency
FROM v_campaign_daily f
LEFT JOIN profile_currency pc ON pc.profile_id = f.profile_id;

-- Create helper function for campaign rollup KPIs
CREATE OR REPLACE FUNCTION get_campaign_rollup_kpis(
  p_profile_ids text[],
  p_from_date date,
  p_to_date date,
  p_base_currency text DEFAULT 'GBP'
)
RETURNS TABLE(
  total_spend numeric,
  total_sales numeric,
  total_clicks bigint,
  total_impressions bigint,
  total_conversions bigint,
  avg_acos numeric,
  avg_roas numeric,
  avg_cpc numeric,
  avg_ctr numeric,
  avg_cvr numeric,
  base_currency text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE 
      WHEN p_base_currency = 'GBP' THEN SUM(fx.spend_gbp)
      WHEN p_base_currency = 'USD' THEN SUM(fx.spend_usd) 
      WHEN p_base_currency = 'EUR' THEN SUM(fx.spend_eur)
      ELSE SUM(fx.spend_gbp)
    END as total_spend,
    CASE 
      WHEN p_base_currency = 'GBP' THEN SUM(fx.sales_gbp)
      WHEN p_base_currency = 'USD' THEN SUM(fx.sales_usd)
      WHEN p_base_currency = 'EUR' THEN SUM(fx.sales_eur)
      ELSE SUM(fx.sales_gbp)
    END as total_sales,
    SUM(fx.clicks)::bigint as total_clicks,
    SUM(fx.impressions)::bigint as total_impressions,
    SUM(fx.orders_7d)::bigint as total_conversions,
    CASE 
      WHEN SUM(CASE 
        WHEN p_base_currency = 'GBP' THEN fx.sales_gbp
        WHEN p_base_currency = 'USD' THEN fx.sales_usd
        WHEN p_base_currency = 'EUR' THEN fx.sales_eur
        ELSE fx.sales_gbp
      END) > 0 THEN 
        (SUM(CASE 
          WHEN p_base_currency = 'GBP' THEN fx.spend_gbp
          WHEN p_base_currency = 'USD' THEN fx.spend_usd
          WHEN p_base_currency = 'EUR' THEN fx.spend_eur
          ELSE fx.spend_gbp
        END) / SUM(CASE 
          WHEN p_base_currency = 'GBP' THEN fx.sales_gbp
          WHEN p_base_currency = 'USD' THEN fx.sales_usd
          WHEN p_base_currency = 'EUR' THEN fx.sales_eur
          ELSE fx.sales_gbp
        END)) * 100
      ELSE 0
    END as avg_acos,
    CASE 
      WHEN SUM(CASE 
        WHEN p_base_currency = 'GBP' THEN fx.spend_gbp
        WHEN p_base_currency = 'USD' THEN fx.spend_usd
        WHEN p_base_currency = 'EUR' THEN fx.spend_eur
        ELSE fx.spend_gbp
      END) > 0 THEN 
        SUM(CASE 
          WHEN p_base_currency = 'GBP' THEN fx.sales_gbp
          WHEN p_base_currency = 'USD' THEN fx.sales_usd
          WHEN p_base_currency = 'EUR' THEN fx.sales_eur
          ELSE fx.sales_gbp
        END) / SUM(CASE 
          WHEN p_base_currency = 'GBP' THEN fx.spend_gbp
          WHEN p_base_currency = 'USD' THEN fx.spend_usd
          WHEN p_base_currency = 'EUR' THEN fx.spend_eur
          ELSE fx.spend_gbp
        END)
      ELSE 0
    END as avg_roas,
    CASE 
      WHEN SUM(fx.clicks) > 0 THEN 
        SUM(CASE 
          WHEN p_base_currency = 'GBP' THEN fx.spend_gbp
          WHEN p_base_currency = 'USD' THEN fx.spend_usd
          WHEN p_base_currency = 'EUR' THEN fx.spend_eur
          ELSE fx.spend_gbp
        END) / SUM(fx.clicks)
      ELSE 0
    END as avg_cpc,
    CASE 
      WHEN SUM(fx.impressions) > 0 THEN 
        (SUM(fx.clicks)::numeric / SUM(fx.impressions)) * 100
      ELSE 0
    END as avg_ctr,
    CASE 
      WHEN SUM(fx.clicks) > 0 THEN 
        (SUM(fx.orders_7d)::numeric / SUM(fx.clicks)) * 100
      ELSE 0
    END as avg_cvr,
    p_base_currency as base_currency
  FROM v_campaign_daily_fx fx
  WHERE fx.profile_id = ANY(p_profile_ids)
    AND fx.date >= p_from_date
    AND fx.date <= p_to_date;
END;
$$;

-- Create helper function for high ACOS targets (used by playbooks)
CREATE OR REPLACE FUNCTION get_high_acos_targets(
  p_profile_id text,
  p_from_date date,
  p_to_date date,
  p_acos_threshold numeric
)
RETURNS TABLE(
  target_id text,
  target_type text,
  acos numeric,
  spend numeric,
  sales numeric,
  clicks bigint,
  bid_micros bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ftd.target_id,
    ftd.target_type,
    CASE 
      WHEN SUM(ftd.attributed_sales_7d_micros) > 0 THEN 
        (SUM(ftd.cost_micros)::numeric / SUM(ftd.attributed_sales_7d_micros)) * 100
      ELSE 999.99
    END as acos,
    SUM(ftd.cost_micros)::numeric / 1000000 as spend,
    SUM(ftd.attributed_sales_7d_micros)::numeric / 1000000 as sales,
    SUM(ftd.clicks) as clicks,
    1000000::bigint as bid_micros -- Default $1.00, would be fetched from targets table
  FROM fact_target_daily ftd
  WHERE ftd.profile_id = p_profile_id
    AND ftd.date >= p_from_date
    AND ftd.date <= p_to_date
  GROUP BY ftd.target_id, ftd.target_type
  HAVING CASE 
    WHEN SUM(ftd.attributed_sales_7d_micros) > 0 THEN 
      (SUM(ftd.cost_micros)::numeric / SUM(ftd.attributed_sales_7d_micros)) * 100
    ELSE 999.99
  END > p_acos_threshold
    AND SUM(ftd.clicks) >= 5; -- Minimum clicks threshold
END;
$$;

-- Sample FX rates for testing
INSERT INTO fx_rates_daily (date, from_ccy, to_ccy, rate) VALUES
-- USD to GBP (approximate rates)
(CURRENT_DATE, 'USD', 'GBP', 0.79),
(CURRENT_DATE - INTERVAL '1 day', 'USD', 'GBP', 0.785),
(CURRENT_DATE - INTERVAL '7 days', 'USD', 'GBP', 0.788),
(CURRENT_DATE - INTERVAL '14 days', 'USD', 'GBP', 0.792),

-- EUR to GBP
(CURRENT_DATE, 'EUR', 'GBP', 0.85),
(CURRENT_DATE - INTERVAL '1 day', 'EUR', 'GBP', 0.848),
(CURRENT_DATE - INTERVAL '7 days', 'EUR', 'GBP', 0.852),
(CURRENT_DATE - INTERVAL '14 days', 'EUR', 'GBP', 0.855),

-- GBP to USD
(CURRENT_DATE, 'GBP', 'USD', 1.27),
(CURRENT_DATE - INTERVAL '1 day', 'GBP', 'USD', 1.274),
(CURRENT_DATE - INTERVAL '7 days', 'GBP', 'USD', 1.269),
(CURRENT_DATE - INTERVAL '14 days', 'GBP', 'USD', 1.263),

-- EUR to USD
(CURRENT_DATE, 'EUR', 'USD', 1.08),
(CURRENT_DATE - INTERVAL '1 day', 'EUR', 'USD', 1.082),
(CURRENT_DATE - INTERVAL '7 days', 'EUR', 'USD', 1.078),
(CURRENT_DATE - INTERVAL '14 days', 'EUR', 'USD', 1.075),

-- USD to EUR
(CURRENT_DATE, 'USD', 'EUR', 0.926),
(CURRENT_DATE - INTERVAL '1 day', 'USD', 'EUR', 0.924),
(CURRENT_DATE - INTERVAL '7 days', 'USD', 'EUR', 0.928),
(CURRENT_DATE - INTERVAL '14 days', 'USD', 'EUR', 0.930),

-- GBP to EUR
(CURRENT_DATE, 'GBP', 'EUR', 1.176),
(CURRENT_DATE - INTERVAL '1 day', 'GBP', 'EUR', 1.179),
(CURRENT_DATE - INTERVAL '7 days', 'GBP', 'EUR', 1.173),
(CURRENT_DATE - INTERVAL '14 days', 'GBP', 'EUR', 1.169)

ON CONFLICT (date, from_ccy, to_ccy) DO UPDATE SET
rate = EXCLUDED.rate;