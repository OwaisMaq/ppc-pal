-- Add attribution window columns to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS acos_7d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS acos_14d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS roas_7d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS roas_14d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sales_7d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sales_14d numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS orders_7d integer;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS orders_14d integer;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS attribution_model text DEFAULT '14d';

-- Add attribution window columns to ad_groups table
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS acos_7d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS acos_14d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS roas_7d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS roas_14d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS sales_7d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS sales_14d numeric;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS orders_7d integer;
ALTER TABLE public.ad_groups ADD COLUMN IF NOT EXISTS orders_14d integer;

-- Add attribution window columns to keywords table
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS acos_7d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS acos_14d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS roas_7d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS roas_14d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS sales_7d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS sales_14d numeric;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS orders_7d integer;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS orders_14d integer;

-- Add reporting API version tracking to amazon_connections
ALTER TABLE public.amazon_connections ADD COLUMN IF NOT EXISTS reporting_api_version text DEFAULT 'v3';
ALTER TABLE public.amazon_connections ADD COLUMN IF NOT EXISTS supported_attribution_models text[] DEFAULT ARRAY['7d', '14d'];

-- Create index for better performance on attribution queries
CREATE INDEX IF NOT EXISTS idx_campaigns_attribution ON public.campaigns(attribution_model);
CREATE INDEX IF NOT EXISTS idx_campaigns_acos_7d ON public.campaigns(acos_7d);
CREATE INDEX IF NOT EXISTS idx_campaigns_acos_14d ON public.campaigns(acos_14d);

-- Update sync function to handle new attribution data
CREATE OR REPLACE FUNCTION public.sync_amazon_data_v3(connection_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update last sync timestamp with v3 API indicator
  UPDATE public.amazon_connections 
  SET 
    last_sync_at = now(), 
    updated_at = now(),
    reporting_api_version = 'v3'
  WHERE id = connection_uuid;
END;
$function$;