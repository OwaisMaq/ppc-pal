
-- Create automation_preferences table to store user automation settings
CREATE TABLE public.automation_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  auto_optimization_enabled BOOLEAN NOT NULL DEFAULT false,
  optimization_frequency_hours INTEGER NOT NULL DEFAULT 24, -- How often to run optimization in hours
  auto_bidding_enabled BOOLEAN NOT NULL DEFAULT false,
  max_bid_adjustment_percent INTEGER NOT NULL DEFAULT 20,
  performance_review_days INTEGER NOT NULL DEFAULT 7,
  auto_keywords_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_pausing_enabled BOOLEAN NOT NULL DEFAULT false,
  acos_pause_threshold NUMERIC NOT NULL DEFAULT 50.0,
  budget_optimization_enabled BOOLEAN NOT NULL DEFAULT false,
  max_budget_increase_percent INTEGER NOT NULL DEFAULT 15,
  last_optimization_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

-- Enable RLS for automation_preferences
ALTER TABLE public.automation_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own automation preferences" 
  ON public.automation_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation preferences" 
  ON public.automation_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation preferences" 
  ON public.automation_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation preferences" 
  ON public.automation_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable pg_cron extension for scheduling (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;
