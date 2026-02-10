-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule Profit Pulse to run every Monday at 8am UTC
SELECT cron.schedule(
  'profit-pulse-weekly',
  '0 8 * * 1',
  $$
  SELECT
    net.http_post(
        url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/profit-pulse',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
