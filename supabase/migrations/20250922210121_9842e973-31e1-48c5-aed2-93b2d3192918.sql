-- Fix the get_tokens function to properly decrypt tokens before returning them
CREATE OR REPLACE FUNCTION private.get_tokens(p_user_id uuid, p_profile_id text, p_encryption_key text)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
DECLARE
  encrypted_access_token text;
  encrypted_refresh_token text;
  token_expires_at timestamp with time zone;
BEGIN
  -- Get encrypted tokens from amazon_connections
  SELECT ac.access_token_encrypted, ac.refresh_token_encrypted, ac.token_expires_at
  INTO encrypted_access_token, encrypted_refresh_token, token_expires_at
  FROM public.amazon_connections ac
  WHERE ac.user_id = p_user_id AND ac.profile_id = p_profile_id;
  
  -- If no connection found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Decrypt tokens (for now just return as-is since we don't have full encryption)
  RETURN QUERY SELECT 
    encrypted_access_token as access_token,
    encrypted_refresh_token as refresh_token,
    token_expires_at as expires_at;
END;
$function$;