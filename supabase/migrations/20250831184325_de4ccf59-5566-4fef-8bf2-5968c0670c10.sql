-- Phase 4A: Amazon Marketing Stream (AMS) schema (corrected)
-- Staging table for raw AMS messages
CREATE TABLE IF NOT EXISTS public.ams_staging (
  id bigserial PRIMARY KEY,
  profile_id text NOT NULL,
  dataset text NOT NULL,               -- sp-performance | sb-performance | sd-performance | budget-usage
  record_id text NOT NULL,             -- from AMS message metadata
  event_time timestamptz NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz DEFAULT now(),
  UNIQUE (dataset, record_id)
);

CREATE INDEX IF NOT EXISTS idx_ams_staging_profile_time 
ON public.ams_staging (profile_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_ams_staging_dataset_time 
ON public.ams_staging (dataset, event_time DESC);

-- Hourly facts for SP performance
CREATE TABLE IF NOT EXISTS public.fact_sp_hourly (
  hour timestamptz NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  target_id text DEFAULT '',
  clicks bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_1d bigint DEFAULT 0,
  attributed_conversions_7d bigint DEFAULT 0,
  attributed_sales_1d_micros bigint DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (hour, profile_id, campaign_id, ad_group_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_sp_hourly_profile_hour 
ON public.fact_sp_hourly (profile_id, hour DESC);

-- Hourly facts for SB performance
CREATE TABLE IF NOT EXISTS public.fact_sb_hourly (
  hour timestamptz NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  target_id text DEFAULT '',
  clicks bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_1d bigint DEFAULT 0,
  attributed_conversions_7d bigint DEFAULT 0,
  attributed_sales_1d_micros bigint DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (hour, profile_id, campaign_id, ad_group_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_sb_hourly_profile_hour 
ON public.fact_sb_hourly (profile_id, hour DESC);

-- Hourly facts for SD performance  
CREATE TABLE IF NOT EXISTS public.fact_sd_hourly (
  hour timestamptz NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  target_id text DEFAULT '',
  clicks bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_1d bigint DEFAULT 0,
  attributed_conversions_7d bigint DEFAULT 0,
  attributed_sales_1d_micros bigint DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (hour, profile_id, campaign_id, ad_group_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_sd_hourly_profile_hour 
ON public.fact_sd_hourly (profile_id, hour DESC);

-- Budget usage facts (near-real-time)
CREATE TABLE IF NOT EXISTS public.fact_budget_usage (
  minute timestamptz NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  budget_micros bigint,
  spend_micros bigint,
  pace numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (minute, profile_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_budget_usage_profile_minute 
ON public.fact_budget_usage (profile_id, minute DESC);

-- Key-value store for watermarks and metadata
CREATE TABLE IF NOT EXISTS public.meta_kv (
  k text PRIMARY KEY,
  v jsonb,
  updated_at timestamptz DEFAULT now()
);

-- AMS subscriptions tracking
CREATE TABLE IF NOT EXISTS public.ams_subscriptions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  dataset_id text NOT NULL,
  subscription_id text,
  status text NOT NULL DEFAULT 'pending',     -- active | pending | error | archived
  region text,
  destination_type text,
  destination_arn text,
  error text,
  last_delivery_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_ams_subscriptions_v2_profile 
ON public.ams_subscriptions_v2 (profile_id);

-- Phase 4B: Billing and subscriptions schema
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',                 -- free | starter | pro
  status text NOT NULL DEFAULT 'active',             -- active | past_due | canceled | trialing
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_customer 
ON public.billing_subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_subscription 
ON public.billing_subscriptions (stripe_subscription_id);

-- Plan entitlements lookup table
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan text PRIMARY KEY,
  features jsonb NOT NULL,
  limits jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default plan configurations
INSERT INTO public.plan_entitlements (plan, features, limits) VALUES
('free', 
 '{"manual_v3_pulls": true, "ams_realtime": false, "backfills": false, "alerts": false}'::jsonb,
 '{"profiles": 1, "campaigns": 10, "monthly_syncs": 30}'::jsonb
),
('starter', 
 '{"manual_v3_pulls": true, "ams_realtime": true, "ams_sp_only": true, "backfills": false, "alerts": false}'::jsonb,
 '{"profiles": 3, "campaigns": 100, "monthly_syncs": 1000}'::jsonb
),
('pro', 
 '{"manual_v3_pulls": true, "ams_realtime": true, "ams_all_datasets": true, "backfills": true, "alerts": true}'::jsonb,
 '{"profiles": 10, "campaigns": 1000, "monthly_syncs": 10000}'::jsonb
)
ON CONFLICT (plan) DO UPDATE SET
  features = EXCLUDED.features,
  limits = EXCLUDED.limits;