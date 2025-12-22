-- Create ai_insights table to store generated insights with approval workflow
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL,
  reason_code TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Create user_ai_settings table for auto-apply preferences
CREATE TABLE public.user_ai_settings (
  user_id UUID PRIMARY KEY,
  auto_apply_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_apply_max_impact TEXT NOT NULL DEFAULT 'low' CHECK (auto_apply_max_impact IN ('low', 'medium', 'high')),
  auto_apply_min_confidence NUMERIC NOT NULL DEFAULT 0.8,
  auto_apply_action_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_profile_id ON public.ai_insights(profile_id);
CREATE INDEX idx_ai_insights_status ON public.ai_insights(status);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at DESC);

-- RLS policies for ai_insights
CREATE POLICY "Users can view their own insights"
ON public.ai_insights FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own insights"
ON public.ai_insights FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all insights"
ON public.ai_insights FOR ALL
TO authenticated
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS policies for user_ai_settings
CREATE POLICY "Users can view their own AI settings"
ON public.user_ai_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own AI settings"
ON public.user_ai_settings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI settings"
ON public.user_ai_settings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_ai_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_ai_settings_timestamp
BEFORE UPDATE ON public.user_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_ai_settings_updated_at();