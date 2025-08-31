-- Phase 6: Rules Engine and Automation Schema

-- Central rule definition
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,         -- budget_depletion | spend_spike | st_harvest | st_prune | placement_opt | bid_down | bid_up
  mode TEXT NOT NULL DEFAULT 'dry_run', -- dry_run | suggestion | auto
  enabled BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'info', -- info | warn | critical
  params JSONB NOT NULL,           -- typed per rule (thresholds, windows)
  action JSONB NOT NULL,           -- typed per rule (what to change)
  throttle JSONB,                  -- {cooldownHours: 24, maxActionsPerDay: 100}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_rules
CREATE POLICY "Users can manage their own automation rules"
ON automation_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage automation rules"
ON automation_rules FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Rule execution runs (every evaluation tick)
CREATE TABLE IF NOT EXISTS automation_rule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'success',   -- success | partial | error
  evaluated INTEGER DEFAULT 0,     -- entities checked
  alerts_created INTEGER DEFAULT 0,
  actions_enqueued INTEGER DEFAULT 0,
  error TEXT
);

-- Enable RLS
ALTER TABLE automation_rule_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_rule_runs
CREATE POLICY "Users can view their rule runs"
ON automation_rule_runs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM automation_rules ar 
  WHERE ar.id = automation_rule_runs.rule_id 
  AND ar.user_id = auth.uid()
));

CREATE POLICY "Service role can manage rule runs"
ON automation_rule_runs FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Alerts raised by rules
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  entity_type TEXT,                -- campaign | ad_group | target | search_term
  entity_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,                      -- payload for UI
  state TEXT NOT NULL DEFAULT 'new', -- new | acknowledged | resolved
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for alerts
CREATE POLICY "Users can manage their alerts"
ON alerts FOR ALL
USING (EXISTS (
  SELECT 1 FROM automation_rules ar 
  WHERE ar.id = alerts.rule_id 
  AND ar.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM automation_rules ar 
  WHERE ar.id = alerts.rule_id 
  AND ar.user_id = auth.uid()
));

CREATE POLICY "Service role can manage alerts"
ON alerts FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS alerts_profile_created ON alerts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_state_created ON alerts(state, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_rule_created ON alerts(rule_id, created_at DESC);

-- Action queue (idempotent)
CREATE TABLE IF NOT EXISTS action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  action_type TEXT NOT NULL,       -- negative_keyword | negative_product | set_placement_adjust | set_bid | pause_target | create_keyword
  payload JSONB NOT NULL,          -- typed per action
  idempotency_key TEXT NOT NULL,   -- hash(payload + profile + action_type)
  status TEXT NOT NULL DEFAULT 'queued', -- queued | applied | failed | skipped
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  UNIQUE(idempotency_key)
);

-- Enable RLS
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_queue
CREATE POLICY "Users can view their action queue"
ON action_queue FOR SELECT
USING (EXISTS (
  SELECT 1 FROM automation_rules ar 
  WHERE ar.id = action_queue.rule_id 
  AND ar.user_id = auth.uid()
));

CREATE POLICY "Service role can manage action queue"
ON action_queue FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Indexes for action_queue
CREATE INDEX IF NOT EXISTS action_queue_status_created ON action_queue(status, created_at);
CREATE INDEX IF NOT EXISTS action_queue_profile_created ON action_queue(profile_id, created_at DESC);

-- User preferences for notifications
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts BOOLEAN DEFAULT true,
  slack_webhook_url TEXT,
  notification_frequency TEXT DEFAULT 'daily', -- immediate | hourly | daily | weekly
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
ON user_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();