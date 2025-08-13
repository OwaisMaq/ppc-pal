-- Create AMS message tables for streaming data
CREATE TABLE IF NOT EXISTS public.ams_messages_sp_traffic (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL,
  profile_id text NOT NULL,
  hour_start timestamptz NOT NULL,
  campaign_id text,
  ad_group_id text,
  keyword_id text,
  target_id text,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ams_messages_sp_conversion (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL,
  profile_id text NOT NULL,
  hour_start timestamptz NOT NULL,
  campaign_id text,
  ad_group_id text,
  keyword_id text,
  target_id text,
  orders integer DEFAULT 0,
  sales numeric DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique indexes for de-duplication
CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_traf_hour_key
  ON public.ams_messages_sp_traffic (connection_id, profile_id, hour_start, COALESCE(campaign_id,''), COALESCE(ad_group_id,''), COALESCE(keyword_id,''), COALESCE(target_id,''));

CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_conv_hour_key
  ON public.ams_messages_sp_conversion (connection_id, profile_id, hour_start, COALESCE(campaign_id,''), COALESCE(ad_group_id,''), COALESCE(keyword_id,''), COALESCE(target_id,''));

-- Add RLS policies for AMS message tables
ALTER TABLE public.ams_messages_sp_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ams_messages_sp_conversion ENABLE ROW LEVEL SECURITY;

-- Service role can manage SP traffic messages
CREATE POLICY "Service role can manage SP traffic messages" ON public.ams_messages_sp_traffic
FOR ALL USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Service role can manage SP conversion messages  
CREATE POLICY "Service role can manage SP conversion messages" ON public.ams_messages_sp_conversion
FOR ALL USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Users can view their SP traffic messages
CREATE POLICY "Users can view their SP traffic messages" ON public.ams_messages_sp_traffic
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.id = ams_messages_sp_traffic.connection_id 
  AND ac.user_id = auth.uid()
));

-- Users can view their SP conversion messages
CREATE POLICY "Users can view their SP conversion messages" ON public.ams_messages_sp_conversion
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.id = ams_messages_sp_conversion.connection_id 
  AND ac.user_id = auth.uid()
));

-- Users can insert SP traffic messages via their connections
CREATE POLICY "Users can insert SP traffic messages via their connections" ON public.ams_messages_sp_traffic
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.id = ams_messages_sp_traffic.connection_id 
  AND ac.user_id = auth.uid()
));

-- Users can insert SP conversion messages via their connections
CREATE POLICY "Users can insert SP conversion messages via their connections" ON public.ams_messages_sp_conversion
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.id = ams_messages_sp_conversion.connection_id 
  AND ac.user_id = auth.uid()
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ams_traffic_connection_hour ON public.ams_messages_sp_traffic (connection_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_ams_conversion_connection_hour ON public.ams_messages_sp_conversion (connection_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_ams_traffic_campaign ON public.ams_messages_sp_traffic (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ams_conversion_campaign ON public.ams_messages_sp_conversion (campaign_id) WHERE campaign_id IS NOT NULL;