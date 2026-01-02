-- Create historical_audit_runs table to track scheduler executions
CREATE TABLE public.historical_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  profiles_processed INTEGER DEFAULT 0,
  profiles_succeeded INTEGER DEFAULT 0,
  profiles_failed INTEGER DEFAULT 0,
  error TEXT,
  audit_month DATE NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for querying
CREATE INDEX idx_historical_audit_runs_status ON public.historical_audit_runs(status);
CREATE INDEX idx_historical_audit_runs_audit_month ON public.historical_audit_runs(audit_month);
CREATE INDEX idx_historical_audit_runs_started_at ON public.historical_audit_runs(started_at DESC);

-- Enable RLS
ALTER TABLE public.historical_audit_runs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records
CREATE POLICY "Service role can manage audit runs"
  ON public.historical_audit_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view audit runs
CREATE POLICY "Admins can view audit runs"
  ON public.historical_audit_runs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add comment
COMMENT ON TABLE public.historical_audit_runs IS 'Tracks execution history of the monthly historical audit scheduler';