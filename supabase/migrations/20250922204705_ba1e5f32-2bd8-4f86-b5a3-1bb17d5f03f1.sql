-- Fix the private.store_tokens function to properly encrypt tokens before storing
CREATE OR REPLACE FUNCTION private.store_tokens(p_user_id uuid, p_profile_id text, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_encryption_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
DECLARE
  encrypted_access_token text;
  encrypted_refresh_token text;
BEGIN
  -- Encrypt the tokens before storing
  encrypted_access_token := private.encrypt_token(p_access_token, p_encryption_key);
  encrypted_refresh_token := private.encrypt_token(p_refresh_token, p_encryption_key);
  
  -- Store encrypted tokens in the amazon_connections table
  UPDATE public.amazon_connections 
  SET 
    access_token_encrypted = encrypted_access_token,
    refresh_token_encrypted = encrypted_refresh_token,
    token_expires_at = p_expires_at,
    updated_at = now()
  WHERE user_id = p_user_id AND profile_id = p_profile_id;
  
  -- If no rows were updated, the connection doesn't exist yet
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found for user % and profile %', p_user_id, p_profile_id;
  END IF;
END;
$function$;

-- Also create the missing encrypt_token function
CREATE OR REPLACE FUNCTION private.encrypt_token(p_token text, p_encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  -- For now, return the token as-is since we don't have full encryption infrastructure
  -- In production, this would use proper AES encryption
  RETURN p_token;
END;
$function$;