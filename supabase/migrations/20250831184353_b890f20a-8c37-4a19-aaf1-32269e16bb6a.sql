-- Enable RLS and add policies for Phase 4 tables

-- Enable RLS on all new tables
ALTER TABLE public.ams_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_sp_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_sb_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_sd_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_budget_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_kv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ams_subscriptions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for ams_staging
CREATE POLICY "Users can view their AMS staging data" 
ON public.ams_staging 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = ams_staging.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage AMS staging data" 
ON public.ams_staging 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for fact tables (SP)
CREATE POLICY "Users can view their SP hourly facts" 
ON public.fact_sp_hourly 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_sp_hourly.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage SP hourly facts" 
ON public.fact_sp_hourly 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for fact tables (SB)
CREATE POLICY "Users can view their SB hourly facts" 
ON public.fact_sb_hourly 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_sb_hourly.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage SB hourly facts" 
ON public.fact_sb_hourly 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for fact tables (SD)
CREATE POLICY "Users can view their SD hourly facts" 
ON public.fact_sd_hourly 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_sd_hourly.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage SD hourly facts" 
ON public.fact_sd_hourly 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for budget usage facts
CREATE POLICY "Users can view their budget usage facts" 
ON public.fact_budget_usage 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = fact_budget_usage.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage budget usage facts" 
ON public.fact_budget_usage 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for meta_kv (admin only)
CREATE POLICY "Service role can manage meta KV" 
ON public.meta_kv 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for AMS subscriptions
CREATE POLICY "Users can view their AMS subscriptions" 
ON public.ams_subscriptions_v2 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM amazon_connections ac 
  WHERE ac.profile_id = ams_subscriptions_v2.profile_id 
  AND ac.user_id = auth.uid()
));

CREATE POLICY "Service role can manage AMS subscriptions" 
ON public.ams_subscriptions_v2 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for billing_subscriptions
CREATE POLICY "Users can view their own billing subscription" 
ON public.billing_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing subscription" 
ON public.billing_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing subscriptions" 
ON public.billing_subscriptions 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for plan_entitlements (read-only for authenticated users)
CREATE POLICY "Authenticated users can view plan entitlements" 
ON public.plan_entitlements 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage plan entitlements" 
ON public.plan_entitlements 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);