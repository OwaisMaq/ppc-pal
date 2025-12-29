-- Create portfolios table
CREATE TABLE public.portfolios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  portfolio_id text NOT NULL,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'enabled',
  budget_amount_micros bigint,
  budget_currency text,
  budget_policy text, -- 'dateRange' or 'monthlyRecurring'
  budget_start_date date,
  budget_end_date date,
  in_budget boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, portfolio_id)
);

-- Add portfolio_id column to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS portfolio_id text;

-- Create index for portfolio lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_portfolio_id ON public.campaigns(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_profile_id ON public.portfolios(profile_id);

-- Enable RLS on portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- RLS policies for portfolios
CREATE POLICY "Users can view portfolios via profile connections"
ON public.portfolios
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = portfolios.profile_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can insert portfolios via profile connections"
ON public.portfolios
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = portfolios.profile_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can update portfolios via profile connections"
ON public.portfolios
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = portfolios.profile_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Users can delete portfolios via profile connections"
ON public.portfolios
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = portfolios.profile_id AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage portfolios"
ON public.portfolios
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create the v_portfolio_metrics view for aggregated portfolio data
CREATE OR REPLACE VIEW public.v_portfolio_metrics AS
SELECT 
  p.profile_id,
  p.portfolio_id,
  p.id as portfolio_uuid,
  p.name as portfolio_name,
  p.state,
  p.budget_amount_micros,
  p.budget_currency,
  p.budget_policy,
  p.in_budget,
  COUNT(DISTINCT c.id) as campaign_count,
  COALESCE(SUM(c.cost_legacy), 0) as total_spend,
  COALESCE(SUM(c.attributed_sales_legacy), 0) as total_sales,
  COALESCE(SUM(c.clicks), 0) as total_clicks,
  COALESCE(SUM(c.impressions), 0) as total_impressions,
  COALESCE(SUM(c.attributed_conversions_legacy), 0) as total_conversions,
  CASE 
    WHEN COALESCE(SUM(c.attributed_sales_legacy), 0) > 0 
    THEN (COALESCE(SUM(c.cost_legacy), 0) / SUM(c.attributed_sales_legacy)) * 100 
    ELSE 0 
  END as acos,
  CASE 
    WHEN COALESCE(SUM(c.cost_legacy), 0) > 0 
    THEN COALESCE(SUM(c.attributed_sales_legacy), 0) / SUM(c.cost_legacy) 
    ELSE 0 
  END as roas,
  CASE 
    WHEN COALESCE(SUM(c.impressions), 0) > 0 
    THEN (COALESCE(SUM(c.clicks), 0)::numeric / SUM(c.impressions)) * 100 
    ELSE 0 
  END as ctr,
  CASE 
    WHEN COALESCE(SUM(c.clicks), 0) > 0 
    THEN COALESCE(SUM(c.cost_legacy), 0) / SUM(c.clicks) 
    ELSE 0 
  END as cpc
FROM public.portfolios p
LEFT JOIN public.campaigns c ON c.profile_id = p.profile_id AND c.portfolio_id = p.portfolio_id
GROUP BY p.profile_id, p.portfolio_id, p.id, p.name, p.state, p.budget_amount_micros, p.budget_currency, p.budget_policy, p.in_budget;