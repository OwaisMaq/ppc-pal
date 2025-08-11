-- Create campaign_budget_usage table and policies
-- 1) Create a daily snapshot table for campaign budget usage
CREATE TABLE IF NOT EXISTS public.campaign_budget_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  -- Snapshot date (typically current day usage)
  date date NOT NULL,
  -- For future extension (DAILY | MONTHLY | CUSTOM)
  period_type text NOT NULL DEFAULT 'DAILY',
  -- For custom windows if ever needed
  window_start timestamp with time zone,
  window_end timestamp with time zone,
  -- Amounts and currency
  currency text,
  budget_amount numeric,
  usage_amount numeric,
  usage_percentage numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Ensure we can’t duplicate the same snapshot
  UNIQUE (campaign_id, date, period_type)
);

-- 2) Enable RLS
ALTER TABLE public.campaign_budget_usage ENABLE ROW LEVEL SECURITY;

-- 3) Policies mirroring other history tables (via campaigns -> amazon_connections -> user)
CREATE POLICY IF NOT EXISTS "Users can insert budget usage via their campaigns"
  ON public.campaign_budget_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.amazon_connections ac ON ac.id = c.connection_id
      WHERE c.id = campaign_budget_usage.campaign_id
        AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update budget usage via their campaigns"
  ON public.campaign_budget_usage
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.amazon_connections ac ON ac.id = c.connection_id
      WHERE c.id = campaign_budget_usage.campaign_id
        AND ac.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.amazon_connections ac ON ac.id = c.connection_id
      WHERE c.id = campaign_budget_usage.campaign_id
        AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view budget usage via their campaigns"
  ON public.campaign_budget_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.amazon_connections ac ON ac.id = c.connection_id
      WHERE c.id = campaign_budget_usage.campaign_id
        AND ac.user_id = auth.uid()
    )
  );

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_campaign_budget_usage_campaign_date
  ON public.campaign_budget_usage (campaign_id, date);

CREATE INDEX IF NOT EXISTS idx_campaign_budget_usage_period_type
  ON public.campaign_budget_usage (period_type);
