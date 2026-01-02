-- Create anomaly_detection_settings table for user-configurable thresholds
CREATE TABLE public.anomaly_detection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  
  -- Global settings
  enabled BOOLEAN DEFAULT true,
  intraday_enabled BOOLEAN DEFAULT true,
  daily_enabled BOOLEAN DEFAULT true,
  
  -- Z-score thresholds per severity (default: warn=3, critical=5)
  warn_threshold NUMERIC DEFAULT 3.0,
  critical_threshold NUMERIC DEFAULT 5.0,
  
  -- Per-metric overrides (optional JSON)
  -- Example: {"spend": {"warn": 2.5, "critical": 4}, "acos": {"warn": 4, "critical": 6}}
  metric_thresholds JSONB DEFAULT '{}',
  
  -- Cooldown settings (hours)
  intraday_cooldown_hours INTEGER DEFAULT 6,
  daily_cooldown_hours INTEGER DEFAULT 48,
  
  -- Notification preferences
  notify_on_warn BOOLEAN DEFAULT false,
  notify_on_critical BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.anomaly_detection_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage their own anomaly settings"
ON public.anomaly_detection_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can read all for scheduled runs
CREATE POLICY "Service role can manage all anomaly settings"
ON public.anomaly_detection_settings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_anomaly_detection_settings_updated_at
BEFORE UPDATE ON public.anomaly_detection_settings
FOR EACH ROW
EXECUTE FUNCTION public.safe_update_updated_at_column();