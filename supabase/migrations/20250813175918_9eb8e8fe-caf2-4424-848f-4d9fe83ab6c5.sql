-- Create AMS messages tables with proper structure and unique constraints
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
  payload jsonb,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
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
  payload jsonb,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create unique indexes for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_traf_hour_key
  ON public.ams_messages_sp_traffic (
    connection_id, profile_id, hour_start,
    coalesce(campaign_id,''), coalesce(ad_group_id,''), 
    coalesce(keyword_id,''), coalesce(target_id,'')
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_ams_conv_hour_key
  ON public.ams_messages_sp_conversion (
    connection_id, profile_id, hour_start,
    coalesce(campaign_id,''), coalesce(ad_group_id,''), 
    coalesce(keyword_id,''), coalesce(target_id,'')
  );

-- Enable RLS
ALTER TABLE public.ams_messages_sp_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ams_messages_sp_conversion ENABLE ROW LEVEL SECURITY;

-- Create policies for users to read their own stream rows
CREATE POLICY "read_own_stream_rows_traffic" ON public.ams_messages_sp_traffic
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.amazon_connections c
          WHERE c.id = ams_messages_sp_traffic.connection_id
            AND c.user_id = auth.uid())
);

CREATE POLICY "read_own_stream_rows_conv" ON public.ams_messages_sp_conversion
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.amazon_connections c
          WHERE c.id = ams_messages_sp_conversion.connection_id
            AND c.user_id = auth.uid())
);

-- Allow service role to insert (for Lambda writes)
CREATE POLICY "service_role_can_insert_traffic" ON public.ams_messages_sp_traffic
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_can_insert_conversion" ON public.ams_messages_sp_conversion
FOR INSERT WITH CHECK (auth.role() = 'service_role');