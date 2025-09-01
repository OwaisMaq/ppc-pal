-- Fix the private.store_tokens function to handle bytea columns properly
CREATE OR REPLACE FUNCTION private.store_tokens(
  p_user_id uuid,
  p_profile_id text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO private, public, extensions
AS $$
DECLARE
  encryption_key text;
  access_token_encrypted bytea;
  refresh_token_encrypted bytea;
BEGIN
  -- Get encryption key from session config
  encryption_key := current_setting('app.enc_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not set in session';
  END IF;
  
  -- Encrypt tokens using pgcrypto
  access_token_encrypted := encrypt(p_access_token::bytea, encryption_key::bytea, 'aes');
  refresh_token_encrypted := encrypt(p_refresh_token::bytea, encryption_key::bytea, 'aes');
  
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

-- Also fix the get_tokens function to properly decrypt
CREATE OR REPLACE FUNCTION private.get_tokens(
  p_user_id uuid,
  p_profile_id text
) RETURNS TABLE(
  access_token text,
  refresh_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO private, public, extensions
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from session config
  encryption_key := current_setting('app.enc_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not set in session';
  END IF;
  
  -- Return decrypted tokens
  RETURN QUERY
  SELECT
    convert_from(decrypt(t.access_token_encrypted, encryption_key::bytea, 'aes'), 'UTF8') as access_token,
    convert_from(decrypt(t.refresh_token_encrypted, encryption_key::bytea, 'aes'), 'UTF8') as refresh_token,
    t.expires_at
  FROM private.amazon_tokens t
  WHERE t.user_id = p_user_id 
    AND t.profile_id = p_profile_id
    AND t.expires_at > now();
END;
$$;