-- Fix encryption algorithm from 'aes-gcm' to 'aes' (pgcrypto supported)
-- This corrects the cipher mismatch that prevents Amazon OAuth reconnection

-- Fix private.store_tokens to use 'aes' cipher
CREATE OR REPLACE FUNCTION private.store_tokens(
  p_user_id uuid, 
  p_profile_id text, 
  p_access_token text, 
  p_refresh_token text, 
  p_expires_at timestamp with time zone, 
  p_encryption_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  encrypted_access text;
  encrypted_refresh text;
BEGIN
  -- Encrypt tokens before storing using 'aes' (not 'aes-gcm')
  BEGIN
    -- Encrypt access token using AES
    encrypted_access := encode(
      extensions.encrypt(
        p_access_token::bytea,
        p_encryption_key::bytea,
        'aes'
      ),
      'base64'
    );
    
    -- Encrypt refresh token using AES
    encrypted_refresh := encode(
      extensions.encrypt(
        p_refresh_token::bytea,
        p_encryption_key::bytea,
        'aes'
      ),
      'base64'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to encrypt tokens for user % profile %: %', 
      p_user_id, p_profile_id, SQLERRM;
  END;
  
  -- Store ENCRYPTED tokens in the database
  UPDATE public.amazon_connections 
  SET 
    access_token_encrypted = encrypted_access,
    refresh_token_encrypted = encrypted_refresh,
    token_expires_at = p_expires_at,
    updated_at = now()
  WHERE user_id = p_user_id AND profile_id = p_profile_id;
  
  -- If no rows were updated, the connection doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found for user % and profile %', p_user_id, p_profile_id;
  END IF;
END;
$$;

-- Fix private.get_tokens to use 'aes' cipher for decryption
CREATE OR REPLACE FUNCTION private.get_tokens(
  p_user_id uuid,
  p_profile_id text,
  p_encryption_key text
)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  encrypted_access_token text;
  encrypted_refresh_token text;
  token_expires_at timestamp with time zone;
BEGIN
  -- Retrieve encrypted tokens from database
  SELECT 
    access_token_encrypted,
    refresh_token_encrypted,
    amazon_connections.token_expires_at
  INTO 
    encrypted_access_token,
    encrypted_refresh_token,
    token_expires_at
  FROM public.amazon_connections
  WHERE user_id = p_user_id AND profile_id = p_profile_id;

  -- If no connection found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Decrypt and return tokens using 'aes' (not 'aes-gcm')
  RETURN QUERY SELECT
    convert_from(
      extensions.decrypt(
        decode(encrypted_access_token, 'base64'),
        p_encryption_key::bytea,
        'aes'
      ),
      'UTF8'
    ) as access_token,
    convert_from(
      extensions.decrypt(
        decode(encrypted_refresh_token, 'base64'),
        p_encryption_key::bytea,
        'aes'
      ),
      'UTF8'
    ) as refresh_token,
    token_expires_at as expires_at;
END;
$$;