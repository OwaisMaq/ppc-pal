-- Create cron job to request performance reports every 2 hours
-- This ensures regular updates of campaign performance data via v3 Reporting API

SELECT cron.schedule(
  'request-performance-reports-2h',
  '0 */2 * * *', -- Every 2 hours at the top of the hour
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/performance-sync-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Add comment explaining the cron job
COMMENT ON EXTENSION pg_cron IS 'Scheduled jobs: entity-auto-sync-2h (entity sync), amazon-token-refresh (token refresh), poll-amazon-reports (report polling), request-performance-reports-2h (performance report requests)';
