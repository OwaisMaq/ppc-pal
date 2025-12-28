-- Create governance_settings table for guardrails
CREATE TABLE public.governance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bid guardrails
  max_bid_change_percent INTEGER DEFAULT 20,
  min_bid_micros INTEGER DEFAULT 100000,  -- $0.10
  max_bid_micros INTEGER DEFAULT 10000000, -- $10.00
  
  -- Spend guardrails
  daily_spend_cap_micros BIGINT,
  monthly_spend_cap_micros BIGINT,
  
  -- Automation guardrails
  max_actions_per_day INTEGER DEFAULT 100,
  require_approval_above_micros INTEGER DEFAULT 1000000, -- $1.00 changes need approval
  
  -- Kill switch state
  automation_paused BOOLEAN DEFAULT false,
  automation_paused_at TIMESTAMPTZ,
  automation_paused_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id)
);

-- Create protected_entities table
CREATE TABLE public.protected_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'ad_group', 'keyword', 'target')),
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.governance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for governance_settings
CREATE POLICY "Users can view their own governance settings"
ON public.governance_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own governance settings"
ON public.governance_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own governance settings"
ON public.governance_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own governance settings"
ON public.governance_settings FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for protected_entities
CREATE POLICY "Users can view their own protected entities"
ON public.protected_entities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own protected entities"
ON public.protected_entities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own protected entities"
ON public.protected_entities FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on governance_settings
CREATE TRIGGER update_governance_settings_updated_at
BEFORE UPDATE ON public.governance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();