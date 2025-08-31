-- Phase 9: Anomaly Alerts + Budget Copilot Schema

-- Anomaly detection runs (bookkeeping)
CREATE TABLE IF NOT EXISTS anomaly_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  scope TEXT NOT NULL,               -- campaign | ad_group | account
  time_window TEXT NOT NULL,         -- intraday | daily
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'success',
  checked INTEGER DEFAULT 0,
  anomalies_found INTEGER DEFAULT 0,
  error TEXT
);

-- Detected anomalies (dedup by fingerprint)
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  scope TEXT NOT NULL,               -- campaign | ad_group | account
  entity_id TEXT,                    -- campaign_id or ad_group_id; null for account
  metric TEXT NOT NULL,              -- spend | acos | cvr | ctr | cpc | sales | impressions
  time_window TEXT NOT NULL,         -- intraday | daily
  ts TIMESTAMPTZ NOT NULL,           -- event time (hour bucket for intraday, date end for daily)
  value NUMERIC NOT NULL,
  baseline NUMERIC NOT NULL,
  score NUMERIC NOT NULL,            -- robust z-score
  direction TEXT NOT NULL,           -- spike | dip
  severity TEXT NOT NULL,            -- info | warn | critical
  fingerprint TEXT NOT NULL,         -- stable hash(profile_id, scope, entity_id, metric, window, bucket)
  state TEXT NOT NULL DEFAULT 'new', -- new | acknowledged | muted | resolved
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fingerprint, ts)
);

-- Notification preferences & outbox
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_webhook TEXT,                -- optional
  email TEXT,                        -- optional override
  digest_frequency TEXT DEFAULT 'hourly' -- instant | hourly | daily
);

CREATE TABLE IF NOT EXISTS notifications_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,             -- slack | email
  subject TEXT NOT NULL,
  body TEXT NOT NULL,                -- markdown allowed
  payload JSONB,                     -- deep-link, entity info
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Budget Copilot recommendations + runs
CREATE TABLE IF NOT EXISTS budget_pacing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'success',
  campaigns_checked INTEGER DEFAULT 0,
  recs_created INTEGER DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS budget_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  day DATE NOT NULL,
  current_budget_micros BIGINT NOT NULL,
  spend_so_far_micros BIGINT NOT NULL,
  forecast_eod_spend_micros BIGINT NOT NULL,
  pace_ratio NUMERIC NOT NULL,       -- actual-to-time / expected-to-time
  action TEXT NOT NULL,              -- increase | decrease | hold
  suggested_budget_micros BIGINT,    -- when action != hold
  reason TEXT,
  mode TEXT NOT NULL DEFAULT 'dry_run', -- dry_run | auto
  state TEXT NOT NULL DEFAULT 'open',   -- open | applied | dismissed | expired
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anomaly_runs_profile_started ON anomaly_runs(profile_id, started_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_profile_created ON anomalies(profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_fingerprint_ts ON anomalies(fingerprint, ts);
CREATE INDEX IF NOT EXISTS idx_anomalies_state_severity ON anomalies(state, severity);
CREATE INDEX IF NOT EXISTS idx_budget_recs_profile_day ON budget_recommendations(profile_id, day);
CREATE INDEX IF NOT EXISTS idx_budget_recs_state_created ON budget_recommendations(state, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_outbox_status ON notifications_outbox(status, created_at);

-- RLS Policies
ALTER TABLE anomaly_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_pacing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_recommendations ENABLE ROW LEVEL SECURITY;

-- Anomaly runs policies
CREATE POLICY "Users can view anomaly runs for their profiles" ON anomaly_runs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = anomaly_runs.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage anomaly runs" ON anomaly_runs
FOR ALL USING (auth.role() = 'service_role');

-- Anomalies policies
CREATE POLICY "Users can view anomalies for their profiles" ON anomalies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = anomalies.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update anomalies for their profiles" ON anomalies
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = anomalies.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage anomalies" ON anomalies
FOR ALL USING (auth.role() = 'service_role');

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_prefs
FOR ALL USING (auth.uid() = user_id);

-- Notifications outbox policies
CREATE POLICY "Users can view their own notifications" ON notifications_outbox
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON notifications_outbox
FOR ALL USING (auth.role() = 'service_role');

-- Budget pacing runs policies
CREATE POLICY "Users can view budget runs for their profiles" ON budget_pacing_runs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = budget_pacing_runs.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage budget runs" ON budget_pacing_runs
FOR ALL USING (auth.role() = 'service_role');

-- Budget recommendations policies
CREATE POLICY "Users can view budget recs for their profiles" ON budget_recommendations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = budget_recommendations.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update budget recs for their profiles" ON budget_recommendations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac 
    WHERE ac.profile_id = budget_recommendations.profile_id AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage budget recommendations" ON budget_recommendations
FOR ALL USING (auth.role() = 'service_role');

-- Helper functions for anomaly detection
CREATE OR REPLACE FUNCTION calculate_robust_z_score(
  p_value NUMERIC,
  p_median NUMERIC,
  p_mad NUMERIC
) RETURNS NUMERIC
LANGUAGE SQL IMMUTABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN p_mad * 1.4826 <= 1e-6 THEN 0
    ELSE (p_value - p_median) / (1.4826 * p_mad)
  END;
$$;

CREATE OR REPLACE FUNCTION get_anomaly_severity(p_z_score NUMERIC)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN ABS(p_z_score) >= 5 THEN 'critical'
    WHEN ABS(p_z_score) >= 3 THEN 'warn'
    ELSE 'info'
  END;
$$;

CREATE OR REPLACE FUNCTION generate_anomaly_fingerprint(
  p_profile_id TEXT,
  p_scope TEXT,
  p_entity_id TEXT,
  p_metric TEXT,
  p_time_window TEXT,
  p_bucket TEXT
) RETURNS TEXT
LANGUAGE SQL IMMUTABLE SECURITY DEFINER
AS $$
  SELECT md5(concat_ws('|', p_profile_id, p_scope, COALESCE(p_entity_id, ''), p_metric, p_time_window, p_bucket));
$$;