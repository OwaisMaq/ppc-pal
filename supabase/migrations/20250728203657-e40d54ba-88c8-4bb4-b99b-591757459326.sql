-- Add columns for additional attribution windows and granular metrics
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ctr_7d numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ctr_14d numeric; 
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpc_7d numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpc_14d numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversion_rate_7d numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversion_rate_14d numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks_7d integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicks_14d integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions_7d integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS impressions_14d integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spend_7d numeric DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spend_14d numeric DEFAULT 0;

-- Add columns for additional ad group metrics
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS ctr_7d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS ctr_14d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS cpc_7d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS cpc_14d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS conversion_rate_7d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS conversion_rate_14d numeric;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS clicks_7d integer DEFAULT 0;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS clicks_14d integer DEFAULT 0;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS impressions_7d integer DEFAULT 0;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS impressions_14d integer DEFAULT 0;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS spend_7d numeric DEFAULT 0;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS spend_14d numeric DEFAULT 0;

-- Add columns for additional keyword metrics (some already exist, ensure they all do)
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS ctr_7d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS ctr_14d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS cpc_7d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS cpc_14d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS conversion_rate_7d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS conversion_rate_14d numeric;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS clicks_7d integer DEFAULT 0;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS clicks_14d integer DEFAULT 0;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS impressions_7d integer DEFAULT 0;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS impressions_14d integer DEFAULT 0;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS spend_7d numeric DEFAULT 0;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS spend_14d numeric DEFAULT 0;

-- Add support for different campaign types
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'Sponsored Products';

-- Add table for storing historical performance data
CREATE TABLE IF NOT EXISTS campaign_performance_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  attribution_window text NOT NULL DEFAULT '14d',
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  sales numeric DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric,
  roas numeric,
  ctr numeric,
  cpc numeric,
  conversion_rate numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date, attribution_window)
);

-- Enable RLS on the new table
ALTER TABLE campaign_performance_history ENABLE ROW LEVEL SECURITY;

-- Create policy for campaign history access
CREATE POLICY "Users can view campaign history through their connections" 
ON campaign_performance_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM campaigns c
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE c.id = campaign_performance_history.campaign_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert campaign history through their connections" 
ON campaign_performance_history 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM campaigns c
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE c.id = campaign_performance_history.campaign_id 
  AND ac.user_id = auth.uid()
));

-- Add table for ad group performance history
CREATE TABLE IF NOT EXISTS adgroup_performance_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adgroup_id uuid REFERENCES ad_groups(id) ON DELETE CASCADE,
  date date NOT NULL,
  attribution_window text NOT NULL DEFAULT '14d',
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  sales numeric DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric,
  roas numeric,
  ctr numeric,
  cpc numeric,
  conversion_rate numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(adgroup_id, date, attribution_window)
);

-- Enable RLS on the new table
ALTER TABLE adgroup_performance_history ENABLE ROW LEVEL SECURITY;

-- Create policy for ad group history access
CREATE POLICY "Users can view adgroup history through their connections" 
ON adgroup_performance_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM ad_groups ag
  JOIN campaigns c ON ag.campaign_id = c.id
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE ag.id = adgroup_performance_history.adgroup_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert adgroup history through their connections" 
ON adgroup_performance_history 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM ad_groups ag
  JOIN campaigns c ON ag.campaign_id = c.id
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE ag.id = adgroup_performance_history.adgroup_id 
  AND ac.user_id = auth.uid()
));

-- Add table for keyword performance history
CREATE TABLE IF NOT EXISTS keyword_performance_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id uuid REFERENCES keywords(id) ON DELETE CASCADE,
  date date NOT NULL,
  attribution_window text NOT NULL DEFAULT '14d',
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  sales numeric DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric,
  roas numeric,
  ctr numeric,
  cpc numeric,
  conversion_rate numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(keyword_id, date, attribution_window)
);

-- Enable RLS on the new table
ALTER TABLE keyword_performance_history ENABLE ROW LEVEL SECURITY;

-- Create policy for keyword history access
CREATE POLICY "Users can view keyword history through their connections" 
ON keyword_performance_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM keywords k
  JOIN ad_groups ag ON k.adgroup_id = ag.id
  JOIN campaigns c ON ag.campaign_id = c.id
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE k.id = keyword_performance_history.keyword_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert keyword history through their connections" 
ON keyword_performance_history 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM keywords k
  JOIN ad_groups ag ON k.adgroup_id = ag.id
  JOIN campaigns c ON ag.campaign_id = c.id
  JOIN amazon_connections ac ON c.connection_id = ac.id
  WHERE k.id = keyword_performance_history.keyword_id 
  AND ac.user_id = auth.uid()
));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_performance_history_campaign_date 
ON campaign_performance_history(campaign_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_adgroup_performance_history_adgroup_date 
ON adgroup_performance_history(adgroup_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_history_keyword_date 
ON keyword_performance_history(keyword_id, date DESC);