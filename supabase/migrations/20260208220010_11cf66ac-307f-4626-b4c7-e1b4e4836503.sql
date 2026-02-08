-- 1. Token refresh already rescheduled in prior migration. Reschedule to every 20 min.
SELECT cron.unschedule('amazon-token-refresh');

SELECT cron.schedule(
  'amazon-token-refresh',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/refresh-all-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-token-refresh-secret', current_setting('app.settings.token_refresh_secret', true)
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- 2. Unschedule 3 individual hourly jobs, replace with single orchestrator
SELECT cron.unschedule('ams-hourly-aggregation');
SELECT cron.unschedule('invoke-daypart-executor-hourly');
SELECT cron.unschedule('rules-engine-runner-1h');

SELECT cron.schedule(
  'hourly-orchestrator',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/hourly-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

-- 3. Reduce AI insights from every 6h to every 12h
SELECT cron.unschedule('ai-insights-scheduler-6h');

SELECT cron.schedule(
  'ai-insights-scheduler-12h',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ai-insights-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);