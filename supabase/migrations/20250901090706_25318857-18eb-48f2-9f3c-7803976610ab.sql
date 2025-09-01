-- Drop existing function if it exists
DROP FUNCTION IF EXISTS private.get_tokens(uuid, text);

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Create a secure table to store encrypted tokens
CREATE TABLE IF NOT EXISTS private.amazon_tokens (
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_id)
);

-- Enable RLS on the tokens table
ALTER TABLE private.amazon_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens
CREATE POLICY "Service role can manage tokens" ON private.amazon_tokens
FOR ALL USING (auth.role() = 'service_role');

-- Create function to store tokens securely
CREATE OR REPLACE FUNCTION private.store_tokens(
  p_user_id UUID,
  p_profile_id TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
  -- Store tokens (they should already be encrypted by the calling function)
  INSERT INTO private.amazon_tokens (
    user_id,
    profile_id,
    access_token_encrypted,
    refresh_token_encrypted,
    expires_at
  ) VALUES (
    p_user_id,
    p_profile_id,
    p_access_token,
    p_refresh_token,
    p_expires_at
  )
  ON CONFLICT (user_id, profile_id) 
  DO UPDATE SET
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retrieve tokens
CREATE OR REPLACE FUNCTION private.get_tokens(
  p_user_id UUID,
  p_profile_id TEXT
) RETURNS TABLE (
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.access_token_encrypted,
    t.refresh_token_encrypted,
    t.expires_at
  FROM private.amazon_tokens t
  WHERE t.user_id = p_user_id AND t.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION private.update_amazon_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_amazon_tokens_updated_at ON private.amazon_tokens;
CREATE TRIGGER update_amazon_tokens_updated_at
  BEFORE UPDATE ON private.amazon_tokens
  FOR EACH ROW
  EXECUTE FUNCTION private.update_amazon_tokens_updated_at();