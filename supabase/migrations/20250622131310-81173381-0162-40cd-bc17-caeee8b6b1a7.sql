
-- Add historical tracking columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN previous_sales numeric DEFAULT 0,
ADD COLUMN previous_spend numeric DEFAULT 0,
ADD COLUMN previous_orders integer DEFAULT 0,
ADD COLUMN previous_month_sales numeric DEFAULT 0,
ADD COLUMN previous_month_spend numeric DEFAULT 0,
ADD COLUMN previous_month_orders integer DEFAULT 0,
ADD COLUMN metrics_last_calculated timestamp with time zone DEFAULT now(),
ADD COLUMN data_source text DEFAULT 'api' CHECK (data_source IN ('api', 'simulated', 'unavailable'));

-- Create a table to store daily campaign metrics for historical tracking
CREATE TABLE public.campaign_metrics_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  sales numeric DEFAULT 0,
  orders integer DEFAULT 0,
  acos numeric,
  roas numeric,
  data_source text DEFAULT 'api' CHECK (data_source IN ('api', 'simulated', 'unavailable')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Enable RLS on the new table
ALTER TABLE public.campaign_metrics_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for campaign_metrics_history
CREATE POLICY "Users can view their own campaign metrics history" 
  ON public.campaign_metrics_history 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE c.id = campaign_metrics_history.campaign_id 
      AND ac.user_id = auth.uid()
    )
  );

-- Create function to calculate month-over-month changes
CREATE OR REPLACE FUNCTION public.calculate_campaign_changes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update campaigns with previous month data for comparison
  UPDATE public.campaigns 
  SET 
    previous_month_sales = COALESCE(
      (SELECT SUM(sales) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    previous_month_spend = COALESCE(
      (SELECT SUM(spend) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    previous_month_orders = COALESCE(
      (SELECT SUM(orders) 
       FROM public.campaign_metrics_history 
       WHERE campaign_id = campaigns.id 
       AND date >= date_trunc('month', now() - interval '1 month')
       AND date < date_trunc('month', now())
      ), 0
    ),
    metrics_last_calculated = now();
END;
$$;
