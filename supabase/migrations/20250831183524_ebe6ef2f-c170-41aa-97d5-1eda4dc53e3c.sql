-- Phase 3: Normalized entity tables and sync state tracking

-- CAMPAIGNS table with normalized structure
CREATE TABLE IF NOT EXISTS public.entity_campaigns (
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  name text,
  campaign_type text,               -- sp | sb | sd
  state text,                       -- enabled/paused/archived
  serving_status text,              -- from API (if provided)
  computed_status text,             -- align with docs if used
  daily_budget_micros bigint,
  bidding jsonb,
  last_updated_time timestamptz,    -- from API
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, campaign_id)
);

-- AD GROUPS table
CREATE TABLE IF NOT EXISTS public.entity_ad_groups (
  profile_id text NOT NULL,
  ad_group_id text NOT NULL,
  campaign_id text NOT NULL,
  name text,
  state text,
  default_bid_micros bigint,
  last_updated_time timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, ad_group_id)
);

-- ADS table (productAds/brandAds/displayAds unified)
CREATE TABLE IF NOT EXISTS public.entity_ads (
  profile_id text NOT NULL,
  ad_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  state text,
  creative jsonb,
  last_updated_time timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, ad_id)
);

-- TARGETS / KEYWORDS table (unified target model)
CREATE TABLE IF NOT EXISTS public.entity_targets (
  profile_id text NOT NULL,
  target_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  expression jsonb,                 -- keyword or product target spec
  match_type text,                  -- exact/phrase/broad/product
  state text,
  bid_micros bigint,
  last_updated_time timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, target_id)
);

-- SYNC STATE table for tracking incremental syncs
CREATE TABLE IF NOT EXISTS public.sync_state (
  profile_id text NOT NULL,
  entity_type text NOT NULL,        -- campaigns | ad_groups | ads | targets
  last_full_sync_at timestamptz,
  last_incremental_sync_at timestamptz,
  high_watermark timestamptz,       -- lastUpdatedAfter cursor
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, entity_type)
);

-- SYNC RUNS table for observability
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  entity_type text NOT NULL,
  mode text NOT NULL,               -- full | incremental
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  items_upserted int DEFAULT 0,
  pages_fetched int DEFAULT 0,
  status text DEFAULT 'running',    -- running | success | error
  error text,
  request_id text,
  created_at timestamptz DEFAULT now()
);

-- Indices for efficient incremental queries
CREATE INDEX IF NOT EXISTS idx_entity_campaigns_profile_updated 
ON public.entity_campaigns (profile_id, last_updated_time DESC);

CREATE INDEX IF NOT EXISTS idx_entity_ad_groups_profile_updated 
ON public.entity_ad_groups (profile_id, last_updated_time DESC);

CREATE INDEX IF NOT EXISTS idx_entity_ads_profile_updated 
ON public.entity_ads (profile_id, last_updated_time DESC);

CREATE INDEX IF NOT EXISTS idx_entity_targets_profile_updated 
ON public.entity_targets (profile_id, last_updated_time DESC);

CREATE INDEX IF NOT EXISTS idx_sync_state_profile_entity 
ON public.sync_state (profile_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_sync_runs_profile_started 
ON public.sync_runs (profile_id, started_at DESC);

-- Foreign key relationships
CREATE INDEX IF NOT EXISTS idx_entity_ad_groups_campaign 
ON public.entity_ad_groups (profile_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_entity_ads_campaign 
ON public.entity_ads (profile_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_entity_ads_ad_group 
ON public.entity_ads (profile_id, ad_group_id);

CREATE INDEX IF NOT EXISTS idx_entity_targets_campaign 
ON public.entity_targets (profile_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_entity_targets_ad_group 
ON public.entity_targets (profile_id, ad_group_id);