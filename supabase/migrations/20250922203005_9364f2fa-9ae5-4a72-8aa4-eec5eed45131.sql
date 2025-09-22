-- Create the missing private.store_tokens function
CREATE OR REPLACE FUNCTION private.store_tokens(p_user_id uuid, p_profile_id text, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_encryption_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $function$
BEGIN
  -- For now, we'll store tokens in the amazon_connections table
  -- In a real implementation, this would encrypt and store in a secure tokens table
  UPDATE public.amazon_connections 
  SET 
    access_token_encrypted = p_access_token,
    refresh_token_encrypted = p_refresh_token,
    token_expires_at = p_expires_at,
    updated_at = now()
  WHERE user_id = p_user_id AND profile_id = p_profile_id;
  
  -- If no rows were updated, the connection doesn't exist yet
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found for user % and profile %', p_user_id, p_profile_id;
  END IF;
END;
$function$;