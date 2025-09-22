-- Fix the store_tokens_with_key function to use correct column name
CREATE OR REPLACE FUNCTION public.store_tokens_with_key(p_user_id uuid, p_profile_id text, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_encryption_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  -- Update the amazon_connections table with token expiry information
  UPDATE public.amazon_connections 
  SET token_expires_at = p_expires_at,
      updated_at = now()
  WHERE user_id = p_user_id AND profile_id = p_profile_id;

  -- Delegate to the private implementation that performs encryption and upsert
  PERFORM private.store_tokens(
    p_user_id,
    p_profile_id,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    p_encryption_key
  );
END;
$function$;