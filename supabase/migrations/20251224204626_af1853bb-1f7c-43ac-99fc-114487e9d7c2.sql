-- Create table to store AI historical audit results
CREATE TABLE public.historical_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  audit_month DATE NOT NULL,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_savings NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, audit_month)
);

-- Enable RLS
ALTER TABLE public.historical_audits ENABLE ROW LEVEL SECURITY;

-- Users can view their own audits
CREATE POLICY "Users can view their own audits"
ON public.historical_audits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own audits
CREATE POLICY "Users can insert their own audits"
ON public.historical_audits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own audits
CREATE POLICY "Users can update their own audits"
ON public.historical_audits
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all audits
CREATE POLICY "Service role can manage audits"
ON public.historical_audits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_historical_audits_profile_month ON public.historical_audits(profile_id, audit_month);
CREATE INDEX idx_historical_audits_user ON public.historical_audits(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_historical_audits_updated_at
BEFORE UPDATE ON public.historical_audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();