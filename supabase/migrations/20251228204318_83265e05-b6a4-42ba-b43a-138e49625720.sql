-- =====================================================
-- PHASE A: Bayesian Bid Optimizer Tables
-- =====================================================

-- Table to track Bayesian state (Beta distribution parameters) per entity
CREATE TABLE public.bid_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('keyword', 'target', 'product_ad')),
  entity_id text NOT NULL,
  campaign_id text,
  ad_group_id text,
  
  -- Beta distribution parameters (posterior)
  alpha numeric NOT NULL DEFAULT 1,  -- successes + prior
  beta numeric NOT NULL DEFAULT 1,   -- failures + prior
  
  -- Prior parameters (for reset/comparison)
  prior_alpha numeric NOT NULL DEFAULT 1,
  prior_beta numeric NOT NULL DEFAULT 1,
  
  -- Current bid state
  current_bid_micros bigint,
  last_sampled_bid_micros bigint,
  last_applied_bid_micros bigint,
  
  -- Confidence metrics (Phase B)
  confidence_lower numeric,
  confidence_upper numeric,
  credible_interval_width numeric,
  confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
  
  -- Tracking
  observations_count integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_clicks integer NOT NULL DEFAULT 0,
  total_impressions bigint NOT NULL DEFAULT 0,
  total_spend_micros bigint NOT NULL DEFAULT 0,
  total_sales_micros bigint NOT NULL DEFAULT 0,
  
  -- Timestamps
  last_observation_at timestamp with time zone,
  last_optimized_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, entity_type, entity_id)
);

-- Table to record daily observations for learning
CREATE TABLE public.bid_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  
  -- Observation data
  date date NOT NULL,
  bid_at_time_micros bigint,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  spend_micros bigint NOT NULL DEFAULT 0,
  sales_micros bigint NOT NULL DEFAULT 0,
  
  -- Calculated reward (margin per impression or conversion rate)
  reward numeric,
  reward_type text DEFAULT 'conversion_rate',
  
  -- Attribution window
  attribution_window text DEFAULT '7d',
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, entity_type, entity_id, date, attribution_window)
);

-- Table to audit optimizer runs
CREATE TABLE public.bid_optimizer_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  
  -- Run metadata
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'partial')),
  error text,
  
  -- Statistics
  entities_evaluated integer DEFAULT 0,
  entities_eligible integer DEFAULT 0,
  bids_sampled integer DEFAULT 0,
  bids_changed integer DEFAULT 0,
  actions_queued integer DEFAULT 0,
  
  -- Configuration used
  config jsonb DEFAULT '{}'::jsonb,
  
  -- Summary
  summary jsonb DEFAULT '{}'::jsonb
);

-- =====================================================
-- PHASE C: Bid Response Curve Tables
-- =====================================================

-- Table to store fitted curve parameters per entity
CREATE TABLE public.bid_response_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  
  -- Model type and parameters
  model_type text NOT NULL CHECK (model_type IN ('sigmoid', 'log_linear', 'linear')),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- sigmoid: {L, k, x0} where impressions = L / (1 + e^(-k(bid - x0)))
  -- log_linear: {a, b} where impressions = a * log(bid) + b
  -- linear: {m, c} where impressions = m * bid + c
  
  -- Model quality
  r_squared numeric,
  rmse numeric,
  samples_used integer,
  
  -- Optimal points
  optimal_bid_micros bigint,
  saturation_bid_micros bigint,  -- Where curve flattens
  knee_bid_micros bigint,        -- Inflection point
  
  -- Timestamps
  last_fitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, entity_type, entity_id)
);

-- =====================================================
-- PHASE D: Portfolio Optimizer Tables
-- =====================================================

-- Table to audit portfolio optimization runs
CREATE TABLE public.portfolio_optimization_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  
  -- Run metadata
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  error text,
  
  -- Inputs
  total_budget_micros bigint,
  campaigns_included integer,
  optimization_goal text DEFAULT 'maximize_roas',
  
  -- Outputs
  reallocation_summary jsonb DEFAULT '[]'::jsonb,
  projected_incremental_sales_micros bigint,
  projected_roas_improvement numeric,
  
  -- Actions
  actions_queued integer DEFAULT 0
);

-- Table to store marginal ROAS curves per campaign
CREATE TABLE public.portfolio_marginal_curves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  
  -- Current state
  current_spend_micros bigint,
  current_sales_micros bigint,
  current_roas numeric,
  current_acos numeric,
  
  -- Marginal ROAS at different spend levels
  -- Format: [{spend_level_micros, marginal_roas, cumulative_roas}]
  marginal_curve jsonb DEFAULT '[]'::jsonb,
  
  -- Key points
  optimal_spend_micros bigint,
  marginal_roas_at_current numeric,
  diminishing_returns_threshold_micros bigint,
  
  -- Model quality
  data_points integer,
  r_squared numeric,
  
  last_calculated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, campaign_id)
);

-- =====================================================
-- PHASE E: Incrementality Engine Tables
-- =====================================================

-- Table to track incrementality experiments
CREATE TABLE public.incrementality_experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  user_id uuid NOT NULL,
  
  -- Experiment setup
  name text NOT NULL,
  experiment_type text NOT NULL CHECK (experiment_type IN ('holdout', 'geo', 'synthetic_control', 'switchback')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  
  -- Treatment/Control groups
  treatment_group jsonb DEFAULT '[]'::jsonb,  -- Entity IDs in treatment
  control_group jsonb DEFAULT '[]'::jsonb,    -- Entity IDs in control
  
  -- Timing
  warmup_start_date date,
  treatment_start_date date,
  treatment_end_date date,
  cooldown_end_date date,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'warmup', 'running', 'cooldown', 'completed', 'cancelled')),
  
  -- Baseline metrics (pre-treatment)
  baseline_metrics jsonb DEFAULT '{}'::jsonb,
  -- {impressions, clicks, conversions, spend, sales, roas, acos}
  
  -- Treatment metrics
  treatment_metrics jsonb DEFAULT '{}'::jsonb,
  
  -- Results
  incremental_lift numeric,
  incremental_lift_percent numeric,
  incremental_sales_micros bigint,
  statistical_significance numeric,  -- p-value
  confidence_interval jsonb,         -- {lower, upper}
  is_significant boolean,
  
  -- Cost analysis
  experiment_cost_micros bigint,     -- Lost revenue from holdout
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table to store synthetic control weights
CREATE TABLE public.synthetic_control_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES public.incrementality_experiments(id) ON DELETE CASCADE,
  
  -- Control entity and weight
  control_entity_type text NOT NULL,
  control_entity_id text NOT NULL,
  weight numeric NOT NULL,
  
  -- Fit quality
  pre_treatment_rmse numeric,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(experiment_id, control_entity_type, control_entity_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_bid_states_profile ON public.bid_states(profile_id);
CREATE INDEX idx_bid_states_entity ON public.bid_states(entity_type, entity_id);
CREATE INDEX idx_bid_states_updated ON public.bid_states(updated_at);

CREATE INDEX idx_bid_observations_profile_date ON public.bid_observations(profile_id, date);
CREATE INDEX idx_bid_observations_entity ON public.bid_observations(entity_type, entity_id, date);

CREATE INDEX idx_bid_optimizer_runs_profile ON public.bid_optimizer_runs(profile_id, started_at DESC);

CREATE INDEX idx_bid_response_models_profile ON public.bid_response_models(profile_id);
CREATE INDEX idx_bid_response_models_entity ON public.bid_response_models(entity_type, entity_id);

CREATE INDEX idx_portfolio_runs_profile ON public.portfolio_optimization_runs(profile_id, started_at DESC);
CREATE INDEX idx_portfolio_curves_profile ON public.portfolio_marginal_curves(profile_id);

CREATE INDEX idx_incrementality_exp_profile ON public.incrementality_experiments(profile_id);
CREATE INDEX idx_incrementality_exp_status ON public.incrementality_experiments(status);
CREATE INDEX idx_synthetic_weights_exp ON public.synthetic_control_weights(experiment_id);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.bid_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_optimizer_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_response_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_marginal_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incrementality_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_control_weights ENABLE ROW LEVEL SECURITY;

-- bid_states policies
CREATE POLICY "Service role can manage bid states"
  ON public.bid_states FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view bid states for their profiles"
  ON public.bid_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_states.profile_id AND ac.user_id = auth.uid()
  ));

-- bid_observations policies
CREATE POLICY "Service role can manage bid observations"
  ON public.bid_observations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view bid observations for their profiles"
  ON public.bid_observations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_observations.profile_id AND ac.user_id = auth.uid()
  ));

-- bid_optimizer_runs policies
CREATE POLICY "Service role can manage optimizer runs"
  ON public.bid_optimizer_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view optimizer runs for their profiles"
  ON public.bid_optimizer_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_optimizer_runs.profile_id AND ac.user_id = auth.uid()
  ));

-- bid_response_models policies
CREATE POLICY "Service role can manage response models"
  ON public.bid_response_models FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view response models for their profiles"
  ON public.bid_response_models FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_response_models.profile_id AND ac.user_id = auth.uid()
  ));

-- portfolio_optimization_runs policies
CREATE POLICY "Service role can manage portfolio runs"
  ON public.portfolio_optimization_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view portfolio runs for their profiles"
  ON public.portfolio_optimization_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = portfolio_optimization_runs.profile_id AND ac.user_id = auth.uid()
  ));

-- portfolio_marginal_curves policies
CREATE POLICY "Service role can manage marginal curves"
  ON public.portfolio_marginal_curves FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view marginal curves for their profiles"
  ON public.portfolio_marginal_curves FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = portfolio_marginal_curves.profile_id AND ac.user_id = auth.uid()
  ));

-- incrementality_experiments policies
CREATE POLICY "Service role can manage experiments"
  ON public.incrementality_experiments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage their experiments"
  ON public.incrementality_experiments FOR ALL
  USING (auth.uid() = user_id);

-- synthetic_control_weights policies
CREATE POLICY "Service role can manage synthetic weights"
  ON public.synthetic_control_weights FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view weights for their experiments"
  ON public.synthetic_control_weights FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM incrementality_experiments ie
    WHERE ie.id = synthetic_control_weights.experiment_id AND ie.user_id = auth.uid()
  ));

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE TRIGGER update_bid_states_updated_at
  BEFORE UPDATE ON public.bid_states
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();

CREATE TRIGGER update_bid_response_models_updated_at
  BEFORE UPDATE ON public.bid_response_models
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();

CREATE TRIGGER update_portfolio_marginal_curves_updated_at
  BEFORE UPDATE ON public.portfolio_marginal_curves
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();

CREATE TRIGGER update_incrementality_experiments_updated_at
  BEFORE UPDATE ON public.incrementality_experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();