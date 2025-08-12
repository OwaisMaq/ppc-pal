-- Phase B: Create tables for Amazon Marketing Stream (AMS)
-- Create ams_subscriptions table
CREATE TABLE IF NOT EXISTS public.ams_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL,
  dataset_id TEXT NOT NULL, -- e.g., 'sp-traffic' | 'sp-conversion'
  subscription_id TEXT,     -- returned by AMS
  status TEXT NOT NULL DEFAULT 'active',
  region TEXT,
  destination_type TEXT,     -- 'sqs' | 'kinesis' | 'firehose'
  destination_arn TEXT,
  last_delivery_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ams_sub_conn FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.ams_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: owner via connection
CREATE POLICY "Users can view AMS subscriptions via their connections"
ON public.ams_subscriptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.id = ams_subscriptions.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert AMS subscriptions via their connections"
ON public.ams_subscriptions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.id = ams_subscriptions.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can update AMS subscriptions via their connections"
ON public.ams_subscriptions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.id = ams_subscriptions.connection_id AND ac.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.id = ams_subscriptions.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can delete AMS subscriptions via their connections"
ON public.ams_subscriptions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.id = ams_subscriptions.connection_id AND ac.user_id = auth.uid()
));

-- updated_at trigger
CREATE TRIGGER update_ams_subscriptions_updated_at
BEFORE UPDATE ON public.ams_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create ams_messages_sp_traffic table
CREATE TABLE IF NOT EXISTS public.ams_messages_sp_traffic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT,
  keyword_id TEXT,
  target_id TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ams_msg_traf_conn FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  CONSTRAINT ams_msg_sp_traffic_unique UNIQUE (connection_id, profile_id, hour_start, campaign_id, ad_group_id, keyword_id, target_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ams_msg_traf_conn_hour ON public.ams_messages_sp_traffic (connection_id, hour_start DESC);

-- RLS
ALTER TABLE public.ams_messages_sp_traffic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their SP traffic messages"
ON public.ams_messages_sp_traffic FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac WHERE ac.id = ams_messages_sp_traffic.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert SP traffic messages via their connections"
ON public.ams_messages_sp_traffic FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.amazon_connections ac WHERE ac.id = ams_messages_sp_traffic.connection_id AND ac.user_id = auth.uid()
));

-- Allow service role full access for ingestion jobs
CREATE POLICY "Service role can manage SP traffic messages"
ON public.ams_messages_sp_traffic FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create ams_messages_sp_conversion table
CREATE TABLE IF NOT EXISTS public.ams_messages_sp_conversion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT,
  keyword_id TEXT,
  target_id TEXT,
  orders INTEGER NOT NULL DEFAULT 0,
  sales NUMERIC NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ams_msg_conv_conn FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  CONSTRAINT ams_msg_sp_conv_unique UNIQUE (connection_id, profile_id, hour_start, campaign_id, ad_group_id, keyword_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_ams_msg_conv_conn_hour ON public.ams_messages_sp_conversion (connection_id, hour_start DESC);

ALTER TABLE public.ams_messages_sp_conversion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their SP conversion messages"
ON public.ams_messages_sp_conversion FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac WHERE ac.id = ams_messages_sp_conversion.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert SP conversion messages via their connections"
ON public.ams_messages_sp_conversion FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.amazon_connections ac WHERE ac.id = ams_messages_sp_conversion.connection_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage SP conversion messages"
ON public.ams_messages_sp_conversion FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
