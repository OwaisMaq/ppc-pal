-- Fix token decryption in private.get_tokens function
-- This resolves 401 errors caused by sending encrypted tokens to Amazon API

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
  decrypted_access text;
  decrypted_refresh text;
BEGIN
  -- Get encrypted tokens from amazon_connections
  SELECT 
    ac.access_token_encrypted, 
    ac.refresh_token_encrypted, 
    ac.token_expires_at
  INTO 
    encrypted_access_token, 
    encrypted_refresh_token, 
    token_expires_at
  FROM public.amazon_connections ac
  WHERE ac.user_id = p_user_id 
    AND ac.profile_id = p_profile_id;
  
  -- If no connection found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- CRITICAL FIX: Actually decrypt the tokens using the encryption key
  BEGIN
    -- Decrypt access token using AES-GCM
    decrypted_access := extensions.decrypt(
      encrypted_access_token::bytea,
      p_encryption_key::bytea,
      'aes-gcm'
    );
    
    -- Decrypt refresh token using AES-GCM
    decrypted_refresh := extensions.decrypt(
      encrypted_refresh_token::bytea,
      p_encryption_key::bytea,
      'aes-gcm'
    );
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails, log a warning and return NULL
    RAISE WARNING 'Failed to decrypt tokens for user % profile %: %', 
      p_user_id, p_profile_id, SQLERRM;
    RETURN;
  END;
  
  -- Return the DECRYPTED tokens (not encrypted)
  RETURN QUERY SELECT 
    decrypted_access as access_token,
    decrypted_refresh as refresh_token,
    token_expires_at as expires_at;
END;
$$;