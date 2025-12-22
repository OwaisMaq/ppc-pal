-- Add search-term-sync cron job (runs daily at 6 AM UTC)
-- Search term reports are resource-intensive, so we run less frequently than other syncs
SELECT cron.schedule(
  'search-term-sync-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/search-term-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled", "dateRange": 14}'::jsonb
  ) as request_id;
  $$
);

-- Also add rules-engine-runner cron job (every 2 hours to evaluate harvest/prune rules)
SELECT cron.schedule(
  'rules-engine-runner-2h',
  '30 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-engine-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled"}'::jsonb
  ) as request_id;
  $$
);