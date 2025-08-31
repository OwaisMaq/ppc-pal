-- Phase 10: Attribution + Path-to-Purchase + Creative Diagnostics Schema

-- 1) Conversion paths (v3 + AMC compatible)
CREATE TABLE IF NOT EXISTS conversion_paths_daily (
  date date NOT NULL,
  source text NOT NULL,                 -- 'v3' | 'amc'
  profile_id text NOT NULL,
  marketplace text,                     -- optional if available
  path_fingerprint text NOT NULL,       -- stable hash of 'path_json'
  path_json jsonb NOT NULL,             -- e.g., [{"type":"sp","interaction":"click"},{"type":"sb","interaction":"view"}, ...]
  conversions bigint DEFAULT 0,
  sales_micros bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  views bigint DEFAULT 0,
  touch_count smallint GENERATED ALWAYS AS (jsonb_array_length(path_json)) STORED,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (date, source, profile_id, path_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_convpaths_profile_date ON conversion_paths_daily(profile_id, date);

-- Time-to-conversion histogram per date
CREATE TABLE IF NOT EXISTS time_lag_daily (
  date date NOT NULL,
  source text NOT NULL,
  profile_id text NOT NULL,
  bucket text NOT NULL,               -- e.g., '0-1d','2-3d','4-7d','8-14d','15-30d'
  conversions bigint DEFAULT 0,
  sales_micros bigint DEFAULT 0,
  PRIMARY KEY (date, source, profile_id, bucket)
);

-- 2) Attribution model outputs
CREATE TABLE IF NOT EXISTS attribution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  model text NOT NULL,                 -- last_click | first_click | position | time_decay | markov
  params jsonb,
  date_from date NOT NULL,
  date_to date NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'success',
  error text
);

-- Results by entity (campaign/ad_group/target) in the requested window
CREATE TABLE IF NOT EXISTS attribution_results (
  run_id uuid REFERENCES attribution_runs(id) ON DELETE CASCADE,
  profile_id text NOT NULL,
  level text NOT NULL,                 -- campaign | ad_group | target
  campaign_id text,
  ad_group_id text,
  target_id text,
  conversions_weighted numeric NOT NULL,
  sales_weighted_micros numeric NOT NULL,
  PRIMARY KEY (run_id, level, coalesce(campaign_id,''), coalesce(ad_group_id,''), coalesce(target_id,''))
);

CREATE INDEX IF NOT EXISTS idx_attrres_profile ON attribution_results(profile_id);

-- 3) Creative diagnostics
-- Asset catalog (from Creative Asset Library API)
CREATE TABLE IF NOT EXISTS creative_assets (
  asset_id text PRIMARY KEY,
  asset_type text NOT NULL,            -- image | video | logo | headline | etc.
  metadata jsonb,                      -- width/height, duration, format, checksum, language, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Map ads -> assets (SB/SD/SP where applicable)
CREATE TABLE IF NOT EXISTS ad_creatives (
  profile_id text NOT NULL,
  ad_id text NOT NULL,
  asset_id text NOT NULL REFERENCES creative_assets(asset_id) ON DELETE CASCADE,
  role text,                           -- primary_image | headline | video | logo | etc.
  PRIMARY KEY (profile_id, ad_id, asset_id)
);

-- Daily creative performance (from v3 'ad' + 'audio-and-video' reports)
CREATE TABLE IF NOT EXISTS creative_performance_daily (
  date date NOT NULL,
  profile_id text NOT NULL,
  ad_id text NOT NULL,
  asset_id text,                       -- nullable if metric is ad-level only
  campaign_id text,
  ad_group_id text,
  clicks bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  conversions_7d bigint DEFAULT 0,
  sales_7d_micros bigint DEFAULT 0,
  video_starts bigint,                 -- when available
  video_q25 bigint,
  video_q50 bigint,
  video_q75 bigint,
  video_completes bigint,
  PRIMARY KEY (date, profile_id, ad_id, coalesce(asset_id,''))
);

CREATE INDEX IF NOT EXISTS idx_cpd_profile_date ON creative_performance_daily(profile_id, date);

-- RLS Policies
ALTER TABLE conversion_paths_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_lag_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_performance_daily ENABLE ROW LEVEL SECURITY;

-- Users can view conversion paths for their profiles
CREATE POLICY "Users can view conversion paths for their profiles"
ON conversion_paths_daily FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = conversion_paths_daily.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage conversion paths
CREATE POLICY "Service role can manage conversion paths"
ON conversion_paths_daily FOR ALL
USING (auth.role() = 'service_role');

-- Users can view time lag for their profiles
CREATE POLICY "Users can view time lag for their profiles"
ON time_lag_daily FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = time_lag_daily.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage time lag
CREATE POLICY "Service role can manage time lag"
ON time_lag_daily FOR ALL
USING (auth.role() = 'service_role');

-- Users can manage their attribution runs
CREATE POLICY "Users can manage their attribution runs"
ON attribution_runs FOR ALL
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = attribution_runs.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage attribution runs
CREATE POLICY "Service role can manage attribution runs"
ON attribution_runs FOR ALL
USING (auth.role() = 'service_role');

-- Users can view attribution results for their profiles
CREATE POLICY "Users can view attribution results for their profiles"
ON attribution_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = attribution_results.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage attribution results
CREATE POLICY "Service role can manage attribution results"
ON attribution_results FOR ALL
USING (auth.role() = 'service_role');

-- Creative assets are viewable by authenticated users
CREATE POLICY "Creative assets are viewable by authenticated users"
ON creative_assets FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role can manage creative assets
CREATE POLICY "Service role can manage creative assets"
ON creative_assets FOR ALL
USING (auth.role() = 'service_role');

-- Users can view ad creatives for their profiles
CREATE POLICY "Users can view ad creatives for their profiles"
ON ad_creatives FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = ad_creatives.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage ad creatives
CREATE POLICY "Service role can manage ad creatives"
ON ad_creatives FOR ALL
USING (auth.role() = 'service_role');

-- Users can view creative performance for their profiles
CREATE POLICY "Users can view creative performance for their profiles"
ON creative_performance_daily FOR SELECT
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac
  WHERE ac.profile_id = creative_performance_daily.profile_id
  AND ac.user_id = auth.uid()
));

-- Service role can manage creative performance
CREATE POLICY "Service role can manage creative performance"
ON creative_performance_daily FOR ALL
USING (auth.role() = 'service_role');

-- Views for performance
CREATE OR REPLACE VIEW v_attribution_campaign AS
SELECT
  r.profile_id,
  r.campaign_id,
  sum(r.sales_weighted_micros)::numeric as sales_attr_micros,
  sum(r.conversions_weighted)::numeric as conv_attr
FROM attribution_results r
WHERE r.level='campaign'
GROUP BY 1,2;

-- Creative KPI view (last 14 days by default)
CREATE OR REPLACE VIEW v_creative_kpis AS
SELECT
  cp.profile_id, 
  cp.ad_id, 
  cp.asset_id,
  sum(impressions) as impr,
  sum(clicks) as clicks,
  sum(cost_micros) as cost_micros,
  sum(conversions_7d) as conv,
  sum(sales_7d_micros) as sales_micros,
  sum(video_starts) as vstarts,
  sum(video_q25) as vq25,
  sum(video_q50) as vq50,
  sum(video_q75) as vq75,
  sum(video_completes) as vcomp
FROM creative_performance_daily cp
WHERE cp.date >= current_date - 14
GROUP BY 1,2,3;

-- Helper function to generate path fingerprint
CREATE OR REPLACE FUNCTION generate_path_fingerprint(path_json jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(path_json::text);
$$;