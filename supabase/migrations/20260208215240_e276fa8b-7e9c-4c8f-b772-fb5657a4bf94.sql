
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Create hourly cron job for daypart executor
SELECT cron.schedule(
  'invoke-daypart-executor-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/daypart-executor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
