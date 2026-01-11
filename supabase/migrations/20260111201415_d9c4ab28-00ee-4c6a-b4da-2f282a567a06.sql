-- Fix Security Definer Views by adding security_invoker = on

-- Drop and recreate v_campaign_daily_fx with security_invoker
DROP VIEW IF EXISTS v_campaign_daily_fx;
CREATE VIEW v_campaign_daily_fx WITH (security_invoker = on) AS
SELECT f.date,
    f.profile_id,
    f.campaign_id,
    f.clicks,
    f.impressions,
    f.cost_micros,
    f.sales_7d_micros,
    f.conv_7d AS orders_7d,
    (((f.cost_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'GBP'::text), 1.0)) AS spend_gbp,
    (((f.sales_7d_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'GBP'::text), 1.0)) AS sales_gbp,
    (((f.cost_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'USD'::text), 1.0)) AS spend_usd,
    (((f.sales_7d_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'USD'::text), 1.0)) AS sales_usd,
    (((f.cost_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'EUR'::text), 1.0)) AS spend_eur,
    (((f.sales_7d_micros)::numeric / 1000000.0) * COALESCE(fx_rate((f.date)::date, pc.currency, 'EUR'::text), 1.0)) AS sales_eur,
    pc.currency AS profile_currency
FROM v_campaign_daily f
LEFT JOIN profile_currency pc ON pc.profile_id = f.profile_id;

-- Drop and recreate v_portfolio_metrics with security_invoker
DROP VIEW IF EXISTS v_portfolio_metrics;
CREATE VIEW v_portfolio_metrics WITH (security_invoker = on) AS
SELECT p.profile_id,
    p.portfolio_id,
    p.id AS portfolio_uuid,
    p.name AS portfolio_name,
    p.state,
    p.budget_amount_micros,
    p.budget_currency,
    p.budget_policy,
    p.in_budget,
    count(DISTINCT c.id) AS campaign_count,
    COALESCE(sum(c.cost_legacy), (0)::numeric) AS total_spend,
    COALESCE(sum(c.attributed_sales_legacy), (0)::numeric) AS total_sales,
    COALESCE(sum(c.clicks), (0)::bigint) AS total_clicks,
    COALESCE(sum(c.impressions), (0)::bigint) AS total_impressions,
    COALESCE(sum(c.attributed_conversions_legacy), (0)::bigint) AS total_conversions,
    CASE
        WHEN (COALESCE(sum(c.attributed_sales_legacy), (0)::numeric) > (0)::numeric) THEN ((COALESCE(sum(c.cost_legacy), (0)::numeric) / sum(c.attributed_sales_legacy)) * (100)::numeric)
        ELSE (0)::numeric
    END AS acos,
    CASE
        WHEN (COALESCE(sum(c.cost_legacy), (0)::numeric) > (0)::numeric) THEN (COALESCE(sum(c.attributed_sales_legacy), (0)::numeric) / sum(c.cost_legacy))
        ELSE (0)::numeric
    END AS roas,
    CASE
        WHEN (COALESCE(sum(c.impressions), (0)::bigint) > 0) THEN (((COALESCE(sum(c.clicks), (0)::bigint))::numeric / (sum(c.impressions))::numeric) * (100)::numeric)
        ELSE (0)::numeric
    END AS ctr,
    CASE
        WHEN (COALESCE(sum(c.clicks), (0)::bigint) > 0) THEN (COALESCE(sum(c.cost_legacy), (0)::numeric) / (sum(c.clicks))::numeric)
        ELSE (0)::numeric
    END AS cpc
FROM portfolios p
LEFT JOIN campaigns c ON c.profile_id = p.profile_id AND c.portfolio_id = p.portfolio_id
GROUP BY p.profile_id, p.portfolio_id, p.id, p.name, p.state, p.budget_amount_micros, p.budget_currency, p.budget_policy, p.in_budget;