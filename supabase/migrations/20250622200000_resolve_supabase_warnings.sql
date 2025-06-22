
-- Resolve Supabase warnings by adding missing RLS policies and foreign key constraints

-- 1. Add missing RLS policies for tables that have RLS enabled but no policies
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
FOR SELECT USING (
  connection_id IN (
    SELECT id FROM public.amazon_connections 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
FOR INSERT WITH CHECK (
  connection_id IN (
    SELECT id FROM public.amazon_connections 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
FOR UPDATE USING (
  connection_id IN (
    SELECT id FROM public.amazon_connections 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
FOR DELETE USING (
  connection_id IN (
    SELECT id FROM public.amazon_connections 
    WHERE user_id = auth.uid()
  )
);

-- 2. Add RLS policies for amazon_connections
CREATE POLICY "Users can view their own connections" ON public.amazon_connections
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own connections" ON public.amazon_connections
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own connections" ON public.amazon_connections
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own connections" ON public.amazon_connections
FOR DELETE USING (user_id = auth.uid());

-- 3. Add RLS policies for ad_groups
CREATE POLICY "Users can view their own ad groups" ON public.ad_groups
FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own ad groups" ON public.ad_groups
FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own ad groups" ON public.ad_groups
FOR UPDATE USING (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own ad groups" ON public.ad_groups
FOR DELETE USING (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

-- 4. Add RLS policies for keywords
CREATE POLICY "Users can view their own keywords" ON public.keywords
FOR SELECT USING (
  adgroup_id IN (
    SELECT ag.id FROM public.ad_groups ag
    JOIN public.campaigns c ON ag.campaign_id = c.id
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own keywords" ON public.keywords
FOR INSERT WITH CHECK (
  adgroup_id IN (
    SELECT ag.id FROM public.ad_groups ag
    JOIN public.campaigns c ON ag.campaign_id = c.id
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own keywords" ON public.keywords
FOR UPDATE USING (
  adgroup_id IN (
    SELECT ag.id FROM public.ad_groups ag
    JOIN public.campaigns c ON ag.campaign_id = c.id
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own keywords" ON public.keywords
FOR DELETE USING (
  adgroup_id IN (
    SELECT ag.id FROM public.ad_groups ag
    JOIN public.campaigns c ON ag.campaign_id = c.id
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

-- 5. Add RLS policies for campaign_metrics_history
CREATE POLICY "Users can view their own campaign metrics" ON public.campaign_metrics_history
FOR SELECT USING (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own campaign metrics" ON public.campaign_metrics_history
FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.amazon_connections ac ON c.connection_id = ac.id
    WHERE ac.user_id = auth.uid()
  )
);

-- 6. Add missing foreign key constraints with proper naming
ALTER TABLE public.campaigns 
ADD CONSTRAINT fk_campaigns_connection_id 
FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

ALTER TABLE public.ad_groups 
ADD CONSTRAINT fk_ad_groups_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.keywords 
ADD CONSTRAINT fk_keywords_adgroup_id 
FOREIGN KEY (adgroup_id) REFERENCES public.ad_groups(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_metrics_history 
ADD CONSTRAINT fk_campaign_metrics_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.optimization_results 
ADD CONSTRAINT fk_optimization_results_connection_id 
FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

ALTER TABLE public.optimization_recommendations 
ADD CONSTRAINT fk_optimization_recommendations_result_id 
FOREIGN KEY (optimization_result_id) REFERENCES public.optimization_results(id) ON DELETE CASCADE;

ALTER TABLE public.automation_preferences 
ADD CONSTRAINT fk_automation_preferences_connection_id 
FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

-- 7. Enable RLS on all tables that should have it
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_preferences ENABLE ROW LEVEL SECURITY;

-- 8. Create indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_campaigns_connection_id ON public.campaigns(connection_id);
CREATE INDEX IF NOT EXISTS idx_ad_groups_campaign_id ON public.ad_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_keywords_adgroup_id ON public.keywords(adgroup_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON public.campaign_metrics_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON public.campaign_metrics_history(date);
CREATE INDEX IF NOT EXISTS idx_amazon_connections_user_id ON public.amazon_connections(user_id);
