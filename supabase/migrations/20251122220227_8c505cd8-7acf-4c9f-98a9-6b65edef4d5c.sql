-- Fix the amazon-token-refresh cron job authentication
-- Drop the old job with broken authentication
SELECT cron.unschedule('amazon-token-refresh');

-- IMPORTANT: Replace 'YOUR_TOKEN_REFRESH_SECRET_VALUE_HERE' with your actual TOKEN_REFRESH_SECRET value
-- You can find this in your Supabase Dashboard → Project Settings → Edge Functions → Secrets
-- The secret should match the TOKEN_REFRESH_SECRET environment variable

-- Create the new job with proper authentication
SELECT cron.schedule(
  'amazon-token-refresh',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-token-refresh-secret', 'YOUR_TOKEN_REFRESH_SECRET_VALUE_HERE'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);