-- Fix the token refresh cron job to use correct pg_net syntax
SELECT cron.alter_job(
  7,  -- jobid for amazon-token-refresh
  schedule := '*/30 * * * *',
  command := $$
    SELECT net.http_post(
      url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hmac-signature', (SELECT generate_token_refresh_hmac())
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);