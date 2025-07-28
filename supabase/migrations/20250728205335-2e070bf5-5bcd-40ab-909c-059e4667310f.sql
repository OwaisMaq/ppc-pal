-- Fix function search path security issues by adding SET search_path TO '' to functions that don't have it

-- Update sync_amazon_data function to include proper search path
CREATE OR REPLACE FUNCTION public.sync_amazon_data(connection_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update last sync timestamp
  UPDATE public.amazon_connections 
  SET last_sync_at = now(), updated_at = now()
  WHERE id = connection_uuid;
END;
$function$;

-- Update calculate_campaign_changes function to include proper search path
CREATE OR REPLACE FUNCTION public.calculate_campaign_changes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update campaigns with previous month data for comparison
  UPDATE public.campaigns 
  SET 
    previous_month_sales = COALESCE(
      (SELECT SUM(sales) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    previous_month_spend = COALESCE(
      (SELECT SUM(spend) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    previous_month_orders = COALESCE(
      (SELECT SUM(orders) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    metrics_last_calculated = now();
END;
$function$;