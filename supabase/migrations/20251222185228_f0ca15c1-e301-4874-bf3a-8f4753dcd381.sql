-- Add actions-worker cron job (every 5 minutes to process queued actions)
SELECT cron.schedule(
  'actions-worker-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/actions-worker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled"}'::jsonb
  ) as request_id;
  $$
);

-- Add anomalies-runner cron job (every 4 hours at minute 15)
SELECT cron.schedule(
  'anomalies-runner-4h',
  '15 */4 * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/anomalies-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled", "scope": "campaign", "window": "daily"}'::jsonb
  ) as request_id;
  $$
);