-- Create token refresh log table for monitoring
CREATE TABLE IF NOT EXISTS public.token_refresh_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_token_refresh_log_connection_id ON public.token_refresh_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_token_refresh_log_profile_id ON public.token_refresh_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_token_refresh_log_refreshed_at ON public.token_refresh_log(refreshed_at DESC);

-- Enable RLS
ALTER TABLE public.token_refresh_log ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view their own refresh logs
CREATE POLICY "Users can view their own token refresh logs"
ON public.token_refresh_log
FOR SELECT
USING (
  profile_id IN (
    SELECT profile_id FROM public.amazon_connections WHERE user_id = auth.uid()
  )
);

-- Create function to generate HMAC signature for cron job
CREATE OR REPLACE FUNCTION public.generate_token_refresh_hmac()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  secret TEXT;
  payload TEXT := '{}';
  signature TEXT;
BEGIN
  -- Get secret from environment (this will be set via edge function)
  secret := current_setting('app.token_refresh_secret', true);
  
  IF secret IS NULL OR secret = '' THEN
    RAISE EXCEPTION 'TOKEN_REFRESH_SECRET not configured';
  END IF;
  
  -- Generate HMAC-SHA256 signature
  signature := encode(
    hmac(payload::bytea, secret::bytea, 'sha256'),
    'hex'
  );
  
  RETURN signature;
END;
$$;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule token refresh every 30 minutes
-- Note: The HMAC signature needs to be generated dynamically
-- For now, we'll create the schedule and update it with proper auth via edge function
SELECT cron.schedule(
  'amazon-token-refresh',
  '*/30 * * * *',
  $$
  SELECT extensions.net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hmac-signature', current_setting('app.token_refresh_hmac', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

COMMENT ON TABLE public.token_refresh_log IS 'Logs all automated token refresh attempts for monitoring and debugging';
