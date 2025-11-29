-- Create new function that accepts encryption key directly to avoid cross-transaction issues
CREATE OR REPLACE FUNCTION public.get_tokens_with_key(
  p_profile_id text,
  p_encryption_key text
)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Get user_id from the connection
  SELECT user_id INTO uid
  FROM public.amazon_connections
  WHERE profile_id = p_profile_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF uid IS NULL THEN
    RETURN;
  END IF;
  
  -- Call the 3-param private function that accepts encryption key
  RETURN QUERY
  SELECT * FROM private.get_tokens(uid, p_profile_id, p_encryption_key);
END;
$$;

-- Clear stale error flags from the reconnected account
UPDATE amazon_connections 
SET setup_required_reason = NULL, 
    health_status = 'healthy',
    updated_at = now()
WHERE id = '4d9afae8-def2-4b63-8f64-1e4a20f50dbc';