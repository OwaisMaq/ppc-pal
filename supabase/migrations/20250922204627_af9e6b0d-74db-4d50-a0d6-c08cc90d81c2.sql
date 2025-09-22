-- Fix the private.get_tokens function to properly decrypt tokens
CREATE OR REPLACE FUNCTION private.get_tokens(p_user_id uuid, p_profile_id text, p_encryption_key text)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  -- Get the encrypted tokens from amazon_connections
  RETURN QUERY
  SELECT 
    CASE 
      -- If token is encrypted (contains ':'), decrypt it
      WHEN ac.access_token_encrypted IS NOT NULL AND ac.access_token_encrypted LIKE '%:%' THEN
        private.decrypt_token(ac.access_token_encrypted, p_encryption_key)
      -- If not encrypted, return as-is
      ELSE ac.access_token_encrypted
    END as access_token,
    CASE 
      -- If token is encrypted (contains ':'), decrypt it  
      WHEN ac.refresh_token_encrypted IS NOT NULL AND ac.refresh_token_encrypted LIKE '%:%' THEN
        private.decrypt_token(ac.refresh_token_encrypted, p_encryption_key)
      -- If not encrypted, return as-is
      ELSE ac.refresh_token_encrypted
    END as refresh_token,
    ac.token_expires_at as expires_at
  FROM public.amazon_connections ac
  WHERE ac.user_id = p_user_id 
    AND ac.profile_id = p_profile_id
    AND ac.status IN ('active', 'setup_required')
  ORDER BY ac.updated_at DESC
  LIMIT 1;
END;
$function$;