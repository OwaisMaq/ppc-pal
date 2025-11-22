-- Update token refresh cron job to use shared secret authentication
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'amazon-token-refresh'),
  schedule := '*/30 * * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Token-Refresh-Secret', current_setting('env.TOKEN_REFRESH_SECRET', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);