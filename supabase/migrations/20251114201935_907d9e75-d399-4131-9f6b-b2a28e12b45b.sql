-- Fix v_campaign_daily_fx view to use security_invoker
CREATE OR REPLACE VIEW v_campaign_daily_fx
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