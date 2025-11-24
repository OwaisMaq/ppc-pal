-- Fix private.store_tokens to actually encrypt tokens before storing
-- This resolves the mismatch where store_tokens saves plain text but get_tokens expects encrypted data

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
  -- CRITICAL FIX: Encrypt tokens before storing (not after)
  BEGIN
    -- Encrypt access token using AES-GCM
    encrypted_access := encode(
      extensions.encrypt(
        p_access_token::bytea,
        p_encryption_key::bytea,
        'aes-gcm'
      ),
      'base64'
    );
    
    -- Encrypt refresh token using AES-GCM
    encrypted_refresh := encode(
      extensions.encrypt(
        p_refresh_token::bytea,
        p_encryption_key::bytea,
        'aes-gcm'
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