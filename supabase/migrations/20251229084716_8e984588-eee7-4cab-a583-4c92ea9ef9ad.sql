-- =====================================================
-- Phase 1 Features: Dayparting, Period-over-Period, Bulk Ops
-- =====================================================

-- Table to store dayparting schedules for campaigns
CREATE TABLE public.daypart_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Schedule stored as JSONB array of {day: 0-6, hour: 0-23, multiplier: number, enabled: boolean}
  -- Example: [{"day": 0, "hour": 8, "enabled": true, "multiplier": 1.2}, ...]
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Default bid multiplier when paused
  pause_multiplier NUMERIC NOT NULL DEFAULT 0.01,
  -- Track last applied state
  last_applied_at TIMESTAMP WITH TIME ZONE,
  last_applied_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint per campaign
  CONSTRAINT unique_campaign_daypart UNIQUE (profile_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.daypart_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their daypart schedules"
ON public.daypart_schedules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all daypart schedules"
ON public.daypart_schedules
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX idx_daypart_profile_campaign ON public.daypart_schedules(profile_id, campaign_id);
CREATE INDEX idx_daypart_enabled ON public.daypart_schedules(enabled) WHERE enabled = true;

-- Trigger to update updated_at
CREATE TRIGGER update_daypart_schedules_updated_at
  BEFORE UPDATE ON public.daypart_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();

-- =====================================================
-- Table to track dayparting execution history
-- =====================================================
CREATE TABLE public.daypart_execution_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.daypart_schedules(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action TEXT NOT NULL, -- 'paused' | 'enabled' | 'bid_adjusted'
  previous_state TEXT,
  new_state TEXT,
  multiplier_applied NUMERIC,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daypart_execution_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their daypart execution history"
ON public.daypart_execution_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.amazon_connections ac
  WHERE ac.profile_id = daypart_execution_history.profile_id
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage all daypart execution history"
ON public.daypart_execution_history
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index for lookups
CREATE INDEX idx_daypart_history_schedule ON public.daypart_execution_history(schedule_id);
CREATE INDEX idx_daypart_history_executed_at ON public.daypart_execution_history(executed_at DESC);