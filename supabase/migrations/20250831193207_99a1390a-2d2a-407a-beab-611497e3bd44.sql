-- Brand terms protection and ignore lists
CREATE TABLE IF NOT EXISTS public.brand_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  term text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, term)
);

CREATE TABLE IF NOT EXISTS public.st_ignore_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  search_term text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  campaign_id text,
  ad_group_id text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS st_ignore_idx ON public.st_ignore_list(profile_id, search_term);

-- Current negatives snapshot for reference  
CREATE TABLE IF NOT EXISTS public.negatives_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  scope text NOT NULL,
  campaign_id text,
  ad_group_id text,
  negative_type text NOT NULL,
  match_type text,
  value text NOT NULL,
  state text,
  last_seen_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, scope, COALESCE(campaign_id,''), COALESCE(ad_group_id,''), negative_type, COALESCE(match_type,''), value)
);

-- Add search term data to fact table if missing (placeholder for existing structure)
CREATE TABLE IF NOT EXISTS public.fact_search_term_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  profile_id text NOT NULL,
  campaign_id text NOT NULL,
  ad_group_id text NOT NULL,
  search_term text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  cost_micros bigint DEFAULT 0,
  attributed_conversions_7d integer DEFAULT 0,
  attributed_sales_7d_micros bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, profile_id, campaign_id, ad_group_id, search_term)
);

-- RLS policies for new tables
ALTER TABLE public.brand_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.st_ignore_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negatives_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_search_term_daily ENABLE ROW LEVEL SECURITY;

-- Brand terms policies
CREATE POLICY "Users can manage their brand terms" ON public.brand_terms
FOR ALL USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = brand_terms.profile_id 
  AND ac.user_id = auth.uid()
));

-- Ignore list policies  
CREATE POLICY "Users can manage their ignore list" ON public.st_ignore_list
FOR ALL USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = st_ignore_list.profile_id 
  AND ac.user_id = auth.uid()
));

-- Negatives snapshot policies
CREATE POLICY "Users can view their negatives snapshot" ON public.negatives_snapshot
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = negatives_snapshot.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage negatives snapshot" ON public.negatives_snapshot
FOR ALL USING (auth.role() = 'service_role');

-- Search term data policies
CREATE POLICY "Users can view their search term data" ON public.fact_search_term_daily
FOR SELECT USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_search_term_daily.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage search term data" ON public.fact_search_term_daily
FOR ALL USING (auth.role() = 'service_role');