-- Phase 1: Database Completeness & Performance

-- Ensure AMS tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.ams_messages_sp_traffic (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT, 
  keyword_id TEXT,
  target_id TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  payload JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ams_messages_sp_conversion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT,
  keyword_id TEXT, 
  target_id TEXT,
  orders INTEGER DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  payload JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create idempotency indexes (prevents duplicate hourly data)
CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_traffic_hour_key
ON public.ams_messages_sp_traffic (
  connection_id, profile_id, hour_start,
  COALESCE(campaign_id,''), COALESCE(ad_group_id,''), 
  COALESCE(keyword_id,''), COALESCE(target_id,'')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_conversion_hour_key  
ON public.ams_messages_sp_conversion (
  connection_id, profile_id, hour_start,
  COALESCE(campaign_id,''), COALESCE(ad_group_id,''),
  COALESCE(keyword_id,''), COALESCE(target_id,'')
);

-- Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ams_traffic_conn_time ON public.ams_messages_sp_traffic (connection_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_ams_traffic_received ON public.ams_messages_sp_traffic (connection_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_ams_conversion_conn_time ON public.ams_messages_sp_conversion (connection_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_conn_spend ON public.campaigns (connection_id, spend DESC NULLS LAST);

-- Enable RLS for AMS tables (already done, but ensuring it's enabled)
ALTER TABLE public.ams_messages_sp_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ams_messages_sp_conversion ENABLE ROW LEVEL SECURITY;

-- Set up scheduled aggregation (runs every hour)
SELECT cron.schedule(
  'ams-hourly-aggregation',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-aggregate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYmtjeHVwempiYmxuenlpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTgzOTMsImV4cCI6MjA2NTA3NDM5M30.o1QD4vm17mSwKfwdX9av0EFNLO8u0J_yIXqQs63RdEM"}'::jsonb,
    body := '{"action": "aggregate_all"}'::jsonb
  );
  $$
);

-- Function to check AMS data freshness
CREATE OR REPLACE FUNCTION public.get_ams_data_freshness(connection_uuid UUID)
RETURNS TABLE (
  last_traffic_message TIMESTAMPTZ,
  last_conversion_message TIMESTAMPTZ,
  messages_24h INTEGER,
  data_age_hours INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT MAX(received_at) FROM public.ams_messages_sp_traffic WHERE connection_id = connection_uuid),
    (SELECT MAX(received_at) FROM public.ams_messages_sp_conversion WHERE connection_id = connection_uuid),
    (SELECT COUNT(*)::INTEGER FROM public.ams_messages_sp_traffic 
     WHERE connection_id = connection_uuid 
     AND received_at > NOW() - INTERVAL '24 hours'),
    GREATEST(
      EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(received_at) FROM public.ams_messages_sp_traffic WHERE connection_id = connection_uuid))) / 3600,
      EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(received_at) FROM public.ams_messages_sp_conversion WHERE connection_id = connection_uuid))) / 3600
    )::INTEGER
  ;
END;
$$;