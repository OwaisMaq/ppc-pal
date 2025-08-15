-- Fix security issue: Set search_path for rollup function
CREATE OR REPLACE FUNCTION rollup_campaign_aggregates_14d(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Roll up the last 14 days from campaign_performance_history into campaigns
  WITH rollup AS (
    SELECT 
      cph.campaign_id,
      SUM(cph.impressions) AS total_impressions,
      SUM(cph.clicks) AS total_clicks,
      SUM(cph.spend) AS total_spend,
      SUM(cph.sales) AS total_sales,
      SUM(cph.orders) AS total_orders
    FROM public.campaign_performance_history cph
    JOIN public.campaigns c ON c.id = cph.campaign_id
    WHERE c.connection_id = p_connection_id
      AND cph.date >= (current_date - INTERVAL '14 days')
      AND cph.attribution_window = '14d'
    GROUP BY cph.campaign_id
  )
  UPDATE public.campaigns c
  SET 
    impressions = r.total_impressions,
    clicks = r.total_clicks,
    cost_legacy = r.total_spend,
    attributed_sales_legacy = r.total_sales,
    attributed_conversions_legacy = r.total_orders,
    acos = CASE 
      WHEN r.total_sales > 0 THEN (r.total_spend / r.total_sales) * 100 
      ELSE 0 
    END,
    roas = CASE 
      WHEN r.total_spend > 0 THEN r.total_sales / r.total_spend 
      ELSE 0 
    END,
    last_updated = now()
  FROM rollup r
  WHERE c.id = r.campaign_id;
END;
$$;