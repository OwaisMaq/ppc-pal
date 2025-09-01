-- Modify the private.store_tokens function to accept encryption key as parameter
CREATE OR REPLACE FUNCTION private.store_tokens(
  p_user_id uuid,
  p_profile_id text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_encryption_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO private, public, extensions
AS $$
DECLARE
  access_token_encrypted bytea;
  refresh_token_encrypted bytea;
BEGIN
  -- Validate encryption key
  IF p_encryption_key IS NULL OR p_encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key cannot be empty';
  END IF;
  
  -- Encrypt tokens using pgcrypto
  access_token_encrypted := encrypt(p_access_token::bytea, p_encryption_key::bytea, 'aes');
  refresh_token_encrypted := encrypt(p_refresh_token::bytea, p_encryption_key::bytea, 'aes');
  
  -- Store encrypted tokens
  INSERT INTO private.amazon_tokens (
    user_id,
    profile_id,
    access_token_encrypted,
    refresh_token_encrypted,
    expires_at,
    encryption_version
  ) VALUES (
    p_user_id,
    p_profile_id,
    access_token_encrypted,
    refresh_token_encrypted,
    p_expires_at,
    1
  )
  ON CONFLICT (user_id, profile_id) 
  DO UPDATE SET
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
END;
$$;

-- Also update the public wrapper to pass the encryption key from environment
CREATE OR REPLACE FUNCTION public."private.store_tokens"(
  p_user_id uuid, 
  p_profile_id text, 
  p_access_token text, 
  p_refresh_token text, 
  p_expires_at timestamp with time zone
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Try to get encryption key from session config first
  BEGIN
    encryption_key := current_setting('app.enc_key', true);
  EXCEPTION WHEN OTHERS THEN
    encryption_key := NULL;
  END;
  
  -- If no session config, this means the edge function should pass it directly
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not set in session or passed as parameter';
  END IF;
  
  -- Call the updated private function
  PERFORM private.store_tokens(p_user_id, p_profile_id, p_access_token, p_refresh_token, p_expires_at, encryption_key);
END;
$$;