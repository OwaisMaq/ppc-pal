-- Target-level daily facts (keyword + product targets)
CREATE TABLE IF NOT EXISTS fact_target_daily (
  date date NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  target_id text NOT NULL,
  target_type text NOT NULL,          -- keyword | product
  expression jsonb,                   -- keyword text + matchType OR product expression (ASIN, category, brand, refinements)
  clicks bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_7d bigint DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  PRIMARY KEY (date, profile_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_ftd_profile_date ON fact_target_daily(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_ftd_target_type ON fact_target_daily(target_type);
CREATE INDEX IF NOT EXISTS idx_ftd_campaign ON fact_target_daily(campaign_id);

-- Enable RLS on fact_target_daily
ALTER TABLE fact_target_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for fact_target_daily
CREATE POLICY "Users can view target facts through their connections" 
ON fact_target_daily FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = fact_target_daily.profile_id 
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage target facts" 
ON fact_target_daily FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Purchased product daily facts (what shoppers bought)
CREATE TABLE IF NOT EXISTS fact_purchased_product_daily (
  date date NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  target_id text,                     -- nullable (some reports aggregate at ad group/campaign)
  advertised_asin text,               -- optional if present
  purchased_asin text NOT NULL,
  units bigint DEFAULT 0,
  sales_micros bigint DEFAULT 0,
  id uuid DEFAULT gen_random_uuid(),
  PRIMARY KEY (date, profile_id, purchased_asin, campaign_id, ad_group_id, id)
);

-- Create unique constraint for the original logical key
CREATE UNIQUE INDEX IF NOT EXISTS idx_fppd_unique ON fact_purchased_product_daily(date, profile_id, purchased_asin, campaign_id, ad_group_id, COALESCE(target_id,''));

CREATE INDEX IF NOT EXISTS idx_fppd_profile_date ON fact_purchased_product_daily(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_fppd_purchased_asin ON fact_purchased_product_daily(purchased_asin);
CREATE INDEX IF NOT EXISTS idx_fppd_advertised_asin ON fact_purchased_product_daily(advertised_asin);

-- Enable RLS on fact_purchased_product_daily
ALTER TABLE fact_purchased_product_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for fact_purchased_product_daily
CREATE POLICY "Users can view purchased product facts through their connections" 
ON fact_purchased_product_daily FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = fact_purchased_product_daily.profile_id 
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage purchased product facts" 
ON fact_purchased_product_daily FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Map profiles to currency
CREATE TABLE IF NOT EXISTS profile_currency (
  profile_id text PRIMARY KEY,
  currency text NOT NULL              -- e.g., USD, GBP, EUR
);

-- Enable RLS on profile_currency
ALTER TABLE profile_currency ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_currency
CREATE POLICY "Users can view profile currency through their connections" 
ON profile_currency FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = profile_currency.profile_id 
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage profile currency" 
ON profile_currency FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Daily FX rates (admin/cron populated)
CREATE TABLE IF NOT EXISTS fx_rates_daily (
  date date NOT NULL,
  from_ccy text NOT NULL,
  to_ccy text NOT NULL,
  rate numeric NOT NULL,              -- multiply native by rate => to_ccy
  PRIMARY KEY (date, from_ccy, to_ccy)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_date ON fx_rates_daily(date);

-- Enable RLS on fx_rates_daily
ALTER TABLE fx_rates_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for fx_rates_daily (public read for authenticated users)
CREATE POLICY "Authenticated users can view FX rates" 
ON fx_rates_daily FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage FX rates" 
ON fx_rates_daily FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Playbooks for templated multi-step automations
CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  template_key text NOT NULL,       -- e.g., "harvest_then_negate"
  params jsonb NOT NULL,            -- thresholds, windows, caps
  mode text NOT NULL DEFAULT 'dry_run',  -- dry_run | auto
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on playbooks
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

-- RLS policies for playbooks
CREATE POLICY "Users can manage their own playbooks" 
ON playbooks FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage playbooks" 
ON playbooks FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE TABLE IF NOT EXISTS playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL,
  profile_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'success',
  steps jsonb,                      -- per-step metrics
  actions_enqueued int DEFAULT 0,
  alerts_created int DEFAULT 0,
  error text
);

-- Enable RLS on playbook_runs
ALTER TABLE playbook_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for playbook_runs
CREATE POLICY "Users can view their playbook runs" 
ON playbook_runs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM playbooks p 
    WHERE p.id = playbook_runs.playbook_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their playbook runs" 
ON playbook_runs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playbooks p 
    WHERE p.id = playbook_runs.playbook_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage playbook runs" 
ON playbook_runs FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Helper function to resolve FX conversion rate with fallback
CREATE OR REPLACE FUNCTION fx_rate(p_date date, p_from text, p_to text)
RETURNS numeric 
LANGUAGE sql 
IMMUTABLE 
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT COALESCE(
    (SELECT rate FROM fx_rates_daily
     WHERE date <= p_date AND from_ccy = p_from AND to_ccy = p_to
     ORDER BY date DESC LIMIT 1),
    CASE WHEN p_from = p_to THEN 1.0 ELSE NULL END
  )
$$;