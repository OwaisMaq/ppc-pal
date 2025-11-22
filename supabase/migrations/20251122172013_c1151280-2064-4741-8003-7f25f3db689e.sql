-- Fix token refresh cron job to use service role key authentication
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'amazon-token-refresh'),
  schedule := '*/30 * * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('env.SUPABASE_SERVICE_ROLE_KEY', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Fix performance sync cron job to use correct service role key
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'request-performance-reports-2h'),
  schedule := '0 */2 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/performance-sync-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('env.SUPABASE_SERVICE_ROLE_KEY', true)
    ),
    body := jsonb_build_object('trigger', 'scheduled')
  ) as request_id;
  $$
);

-- Drop obsolete HMAC generation function
DROP FUNCTION IF EXISTS public.generate_token_refresh_hmac();