
-- Add budget-copilot-runner cron job (every 2 hours at minute 0)
SELECT cron.schedule(
  'budget-copilot-runner-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/budget-copilot-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled"}'::jsonb
  ) as request_id;
  $$
);

-- Add rules-engine-runner cron job (every hour at minute 30)
SELECT cron.schedule(
  'rules-engine-runner-1h',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-engine-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body:='{"trigger": "scheduled"}'::jsonb
  ) as request_id;
  $$
);
