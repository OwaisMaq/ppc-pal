-- Drop and recreate the get_tokens function with correct column name
DROP FUNCTION IF EXISTS private.get_tokens(uuid, text, text);

CREATE OR REPLACE FUNCTION private.get_tokens(p_user_id uuid, p_profile_id text, p_encryption_key text)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ac.access_token_encrypted IS NOT NULL AND p_encryption_key IS NOT NULL THEN
        private.decrypt_token(ac.access_token_encrypted, p_encryption_key)
      ELSE 
        NULL
    END::text as access_token,
    CASE 
      WHEN ac.refresh_token_encrypted IS NOT NULL AND p_encryption_key IS NOT NULL THEN
        private.decrypt_token(ac.refresh_token_encrypted, p_encryption_key)
      ELSE 
        NULL
    END::text as refresh_token,
    ac.token_expires_at as expires_at  -- Use correct column name
  FROM public.amazon_connections ac
  WHERE ac.user_id = p_user_id 
    AND ac.profile_id = p_profile_id
    AND ac.status IN ('active', 'setup_required')
  ORDER BY ac.updated_at DESC
  LIMIT 1;
END;
$function$;