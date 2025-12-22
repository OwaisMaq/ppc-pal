-- Create action_outcomes table to track before/after metrics for applied actions
CREATE TABLE public.action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.action_queue(id) ON DELETE CASCADE,
  profile_id text NOT NULL,
  
  -- Before metrics (captured at action time)
  before_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- After metrics (captured 7 days later)
  after_metrics jsonb DEFAULT NULL,
  
  -- Computed outcome
  metric_delta jsonb DEFAULT NULL,
  outcome_score numeric DEFAULT NULL,  -- -1 to +1 scale
  outcome_status text DEFAULT 'pending' CHECK (outcome_status IN ('pending', 'positive', 'neutral', 'negative', 'inconclusive')),
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  before_captured_at timestamp with time zone NOT NULL DEFAULT now(),
  after_scheduled_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  after_captured_at timestamp with time zone DEFAULT NULL,
  
  UNIQUE(action_id)
);

-- Create index for efficient querying
CREATE INDEX idx_action_outcomes_profile ON public.action_outcomes(profile_id);
CREATE INDEX idx_action_outcomes_status ON public.action_outcomes(outcome_status);
CREATE INDEX idx_action_outcomes_after_scheduled ON public.action_outcomes(after_scheduled_at) 
  WHERE after_captured_at IS NULL;

-- Enable RLS
ALTER TABLE public.action_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage action outcomes"
  ON public.action_outcomes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view their action outcomes"
  ON public.action_outcomes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = action_outcomes.profile_id 
    AND ac.user_id = auth.uid()
  ));

-- Add undo columns to action_queue
ALTER TABLE public.action_queue 
  ADD COLUMN IF NOT EXISTS reverted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revert_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revert_action_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS before_state jsonb DEFAULT NULL;

-- Add index for revertable actions
CREATE INDEX idx_action_queue_revertable ON public.action_queue(status, reverted_at) 
  WHERE status = 'applied' AND reverted_at IS NULL;