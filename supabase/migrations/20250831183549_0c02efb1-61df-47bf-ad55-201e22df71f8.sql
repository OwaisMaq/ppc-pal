-- Enable RLS and add policies for all new entity tables

-- Enable RLS on all new tables
ALTER TABLE public.entity_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for entity_campaigns
CREATE POLICY "Users can view campaigns through their connections" 
ON public.entity_campaigns 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = entity_campaigns.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage campaigns" 
ON public.entity_campaigns 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for entity_ad_groups
CREATE POLICY "Users can view ad groups through their connections" 
ON public.entity_ad_groups 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = entity_ad_groups.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage ad groups" 
ON public.entity_ad_groups 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for entity_ads
CREATE POLICY "Users can view ads through their connections" 
ON public.entity_ads 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = entity_ads.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage ads" 
ON public.entity_ads 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for entity_targets
CREATE POLICY "Users can view targets through their connections" 
ON public.entity_targets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = entity_targets.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage targets" 
ON public.entity_targets 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for sync_state
CREATE POLICY "Users can view sync state through their connections" 
ON public.sync_state 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = sync_state.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage sync state" 
ON public.sync_state 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for sync_runs
CREATE POLICY "Users can view sync runs through their connections" 
ON public.sync_runs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = sync_runs.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage sync runs" 
ON public.sync_runs 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);