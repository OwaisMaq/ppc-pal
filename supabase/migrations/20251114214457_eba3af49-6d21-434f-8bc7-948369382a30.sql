-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create auto_sync_history table for tracking sync attempts
CREATE TABLE IF NOT EXISTS public.auto_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'login', 'manual')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  profile_id text,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  entities_synced jsonb DEFAULT '{}'::jsonb,
  error_details jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_sync_history_user ON public.auto_sync_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_sync_history_connection ON public.auto_sync_history(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_sync_history_trigger ON public.auto_sync_history(trigger_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.auto_sync_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sync history" ON public.auto_sync_history;
DROP POLICY IF EXISTS "Service role can manage sync history" ON public.auto_sync_history;

-- Create RLS policies
CREATE POLICY "Users can view their own sync history"
  ON public.auto_sync_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sync history"
  ON public.auto_sync_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Drop existing schedule if it exists (silently ignore if doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'entity-auto-sync-2h') THEN
    PERFORM cron.unschedule('entity-auto-sync-2h');
  END IF;
END $$;

-- Schedule entity sync every 2 hours
-- Runs at: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 UTC
SELECT cron.schedule(
  'entity-auto-sync-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/entity-auto-sync-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM'
    ),
    body := jsonb_build_object('trigger', 'scheduled')
  );
  $$
);