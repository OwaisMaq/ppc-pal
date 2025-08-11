-- Create targets table for auto-targeting entities
CREATE TABLE IF NOT EXISTS public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adgroup_id UUID NOT NULL,
  amazon_target_id TEXT NOT NULL,
  expression JSONB,
  type TEXT,
  bid NUMERIC,
  status campaign_status NOT NULL DEFAULT 'enabled',
  -- aggregated metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  orders INTEGER DEFAULT 0,
  acos NUMERIC,
  roas NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  conversion_rate NUMERIC,
  -- 7d metrics
  sales_7d NUMERIC,
  orders_7d INTEGER,
  acos_7d NUMERIC,
  roas_7d NUMERIC,
  ctr_7d NUMERIC,
  cpc_7d NUMERIC,
  conversion_rate_7d NUMERIC,
  clicks_7d INTEGER DEFAULT 0,
  impressions_7d INTEGER DEFAULT 0,
  spend_7d NUMERIC DEFAULT 0,
  -- 14d metrics
  sales_14d NUMERIC,
  orders_14d INTEGER,
  acos_14d NUMERIC,
  roas_14d NUMERIC,
  ctr_14d NUMERIC,
  cpc_14d NUMERIC,
  conversion_rate_14d NUMERIC,
  clicks_14d INTEGER DEFAULT 0,
  impressions_14d INTEGER DEFAULT 0,
  spend_14d NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT targets_unique_per_adgroup UNIQUE (adgroup_id, amazon_target_id)
);

-- Foreign key to ad_groups
ALTER TABLE public.targets
  ADD CONSTRAINT targets_adgroup_id_fkey FOREIGN KEY (adgroup_id)
  REFERENCES public.ad_groups(id) ON DELETE CASCADE;

-- Index to speed up lookups by Amazon target id
CREATE INDEX IF NOT EXISTS idx_targets_amazon_target_id ON public.targets(amazon_target_id);

-- Enable Row Level Security
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- Policies mirroring keywords table
CREATE POLICY "Users can view targets through their ad groups"
ON public.targets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM (
      (public.ad_groups ag
        JOIN public.campaigns c ON ag.campaign_id = c.id)
        JOIN public.amazon_connections ac ON c.connection_id = ac.id
    )
    WHERE ag.id = targets.adgroup_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert targets through their ad groups"
ON public.targets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM (
      (public.ad_groups ag
        JOIN public.campaigns c ON ag.campaign_id = c.id)
        JOIN public.amazon_connections ac ON c.connection_id = ac.id
    )
    WHERE ag.id = targets.adgroup_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update targets through their ad groups"
ON public.targets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM (
      (public.ad_groups ag
        JOIN public.campaigns c ON ag.campaign_id = c.id)
        JOIN public.amazon_connections ac ON c.connection_id = ac.id
    )
    WHERE ag.id = targets.adgroup_id AND ac.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM (
      (public.ad_groups ag
        JOIN public.campaigns c ON ag.campaign_id = c.id)
        JOIN public.amazon_connections ac ON c.connection_id = ac.id
    )
    WHERE ag.id = targets.adgroup_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete targets through their ad groups"
ON public.targets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM (
      (public.ad_groups ag
        JOIN public.campaigns c ON ag.campaign_id = c.id)
        JOIN public.amazon_connections ac ON c.connection_id = ac.id
    )
    WHERE ag.id = targets.adgroup_id AND ac.user_id = auth.uid()
  )
);
