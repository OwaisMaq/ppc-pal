-- Fix search path warnings for all functions
CREATE OR REPLACE FUNCTION public.update_ams_subscriptions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_documentation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.extract_asin_from_name(campaign_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT CASE 
    -- Look for pattern like "SP_Product_B0XXXXXX_..." or "SB_Product_B0XXXXXX_..."
    WHEN campaign_name ~ '[_\s]B0[A-Z0-9]{8}[_\s]' THEN
      substring(campaign_name from '[_\s](B0[A-Z0-9]{8})[_\s]') 
    -- Look for standalone ASIN at end or middle with underscores
    WHEN campaign_name ~ '[_\s]B0[A-Z0-9]{8}$' THEN
      substring(campaign_name from '[_\s](B0[A-Z0-9]{8})$')
    -- Look for ASIN pattern anywhere in the name
    WHEN campaign_name ~ 'B0[A-Z0-9]{8}' THEN
      substring(campaign_name from '(B0[A-Z0-9]{8})')
    ELSE NULL
  END;
$function$;