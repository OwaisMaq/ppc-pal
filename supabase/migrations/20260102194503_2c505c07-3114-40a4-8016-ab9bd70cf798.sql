-- ========================================
-- Part 1: Ad Group-Level Bayesian Optimization Support
-- ========================================

-- Add has_custom_bids column to ad_groups to track if any keywords have specific bids
ALTER TABLE public.ad_groups 
ADD COLUMN IF NOT EXISTS has_custom_bids BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.ad_groups.has_custom_bids IS 'True if any keyword in this ad group has a custom bid (not inherited from default)';

-- ========================================
-- Part 2: Placement Optimization Support
-- ========================================

-- Create campaign_placement_performance table for placement-level metrics
CREATE TABLE IF NOT EXISTS public.campaign_placement_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  placement TEXT NOT NULL, -- 'TOP', 'PRODUCT_PAGE', 'REST_OF_SEARCH'
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  orders INTEGER DEFAULT 0,
  acos NUMERIC,
  current_adjustment INTEGER DEFAULT 0, -- Current bid adjustment percentage
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, campaign_id, placement, date)
);

-- Enable RLS
ALTER TABLE public.campaign_placement_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role can manage placement performance"
  ON public.campaign_placement_performance
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view placement performance for their profiles"
  ON public.campaign_placement_performance
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = campaign_placement_performance.profile_id
    AND ac.user_id = auth.uid()
  ));

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_placement_perf_profile_date 
  ON public.campaign_placement_performance(profile_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_placement_perf_campaign 
  ON public.campaign_placement_performance(campaign_id, date DESC);

-- ========================================
-- Part 3: Creative Recommendations Support
-- ========================================

-- Create creative_recommendations table
CREATE TABLE IF NOT EXISTS public.creative_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  ad_id TEXT,
  recommendation_type TEXT NOT NULL, -- 'pause', 'replace', 'test', 'boost'
  reason TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  impact_estimate TEXT, -- 'high', 'medium', 'low'
  metrics JSONB DEFAULT '{}'::jsonb, -- CTR, CPC, ACOS data that triggered recommendation
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.creative_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role can manage creative recommendations"
  ON public.creative_recommendations
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view creative recommendations for their profiles"
  ON public.creative_recommendations
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = creative_recommendations.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their creative recommendations"
  ON public.creative_recommendations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = creative_recommendations.profile_id
    AND ac.user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creative_recs_profile_status 
  ON public.creative_recommendations(profile_id, status);

CREATE INDEX IF NOT EXISTS idx_creative_recs_asset 
  ON public.creative_recommendations(asset_id);