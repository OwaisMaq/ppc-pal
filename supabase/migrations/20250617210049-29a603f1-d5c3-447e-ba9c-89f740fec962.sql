
-- Create enum types for Amazon Ads API
CREATE TYPE api_connection_status AS ENUM ('active', 'expired', 'error', 'pending');
CREATE TYPE campaign_status AS ENUM ('enabled', 'paused', 'archived');
CREATE TYPE optimization_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Table for storing Amazon Ads API connections
CREATE TABLE public.amazon_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  profile_id TEXT NOT NULL, -- Amazon advertising profile ID
  profile_name TEXT,
  marketplace_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status api_connection_status NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing campaign data from Amazon API
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.amazon_connections(id) ON DELETE CASCADE NOT NULL,
  amazon_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT,
  targeting_type TEXT,
  status campaign_status NOT NULL DEFAULT 'enabled',
  budget DECIMAL(10,2),
  daily_budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  acos DECIMAL(5,2),
  roas DECIMAL(5,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, amazon_campaign_id)
);

-- Table for storing ad group data
CREATE TABLE public.ad_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  amazon_adgroup_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'enabled',
  default_bid DECIMAL(8,2),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  acos DECIMAL(5,2),
  roas DECIMAL(5,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, amazon_adgroup_id)
);

-- Table for storing keyword data
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adgroup_id UUID REFERENCES public.ad_groups(id) ON DELETE CASCADE NOT NULL,
  amazon_keyword_id TEXT NOT NULL,
  keyword_text TEXT NOT NULL,
  match_type TEXT NOT NULL,
  bid DECIMAL(8,2),
  status campaign_status NOT NULL DEFAULT 'enabled',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  acos DECIMAL(5,2),
  roas DECIMAL(5,2),
  ctr DECIMAL(5,2),
  cpc DECIMAL(8,2),
  conversion_rate DECIMAL(5,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(adgroup_id, amazon_keyword_id)
);

-- Table for storing optimization results and recommendations
CREATE TABLE public.optimization_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  connection_id UUID REFERENCES public.amazon_connections(id) ON DELETE CASCADE NOT NULL,
  optimization_type TEXT NOT NULL, -- 'bid_adjustment', 'keyword_optimization', 'campaign_optimization'
  status optimization_status NOT NULL DEFAULT 'pending',
  total_keywords_analyzed INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  estimated_impact_spend DECIMAL(10,2),
  estimated_impact_sales DECIMAL(10,2),
  results_data JSONB, -- Store detailed optimization results
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing individual optimization recommendations
CREATE TABLE public.optimization_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  optimization_result_id UUID REFERENCES public.optimization_results(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL, -- 'keyword', 'campaign', 'adgroup'
  entity_id UUID NOT NULL, -- References keywords, campaigns, or ad_groups
  recommendation_type TEXT NOT NULL, -- 'increase_bid', 'decrease_bid', 'pause', 'change_match_type'
  current_value TEXT,
  recommended_value TEXT,
  reasoning TEXT NOT NULL,
  impact_level TEXT NOT NULL, -- 'high', 'medium', 'low'
  estimated_impact DECIMAL(10,2),
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.amazon_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for amazon_connections
CREATE POLICY "Users can view their own connections" 
  ON public.amazon_connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" 
  ON public.amazon_connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
  ON public.amazon_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
  ON public.amazon_connections 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for campaigns (access through connections)
CREATE POLICY "Users can view campaigns through their connections" 
  ON public.campaigns 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.amazon_connections 
      WHERE id = campaigns.connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert campaigns through their connections" 
  ON public.campaigns 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.amazon_connections 
      WHERE id = campaigns.connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaigns through their connections" 
  ON public.campaigns 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.amazon_connections 
      WHERE id = campaigns.connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaigns through their connections" 
  ON public.campaigns 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.amazon_connections 
      WHERE id = campaigns.connection_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for ad_groups (access through campaigns)
CREATE POLICY "Users can view ad groups through their campaigns" 
  ON public.ad_groups 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE c.id = ad_groups.campaign_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ad groups through their campaigns" 
  ON public.ad_groups 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE c.id = ad_groups.campaign_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ad groups through their campaigns" 
  ON public.ad_groups 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE c.id = ad_groups.campaign_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ad groups through their campaigns" 
  ON public.ad_groups 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE c.id = ad_groups.campaign_id AND ac.user_id = auth.uid()
    )
  );

-- RLS Policies for keywords (access through ad groups)
CREATE POLICY "Users can view keywords through their ad groups" 
  ON public.keywords 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_groups ag
      JOIN public.campaigns c ON ag.campaign_id = c.id
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE ag.id = keywords.adgroup_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keywords through their ad groups" 
  ON public.keywords 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_groups ag
      JOIN public.campaigns c ON ag.campaign_id = c.id
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE ag.id = keywords.adgroup_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords through their ad groups" 
  ON public.keywords 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_groups ag
      JOIN public.campaigns c ON ag.campaign_id = c.id
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE ag.id = keywords.adgroup_id AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords through their ad groups" 
  ON public.keywords 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_groups ag
      JOIN public.campaigns c ON ag.campaign_id = c.id
      JOIN public.amazon_connections ac ON c.connection_id = ac.id
      WHERE ag.id = keywords.adgroup_id AND ac.user_id = auth.uid()
    )
  );

-- RLS Policies for optimization_results
CREATE POLICY "Users can view their own optimization results" 
  ON public.optimization_results 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization results" 
  ON public.optimization_results 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization results" 
  ON public.optimization_results 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for optimization_recommendations
CREATE POLICY "Users can view recommendations through their optimization results" 
  ON public.optimization_recommendations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.optimization_results 
      WHERE id = optimization_recommendations.optimization_result_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recommendations through their optimization results" 
  ON public.optimization_recommendations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.optimization_results 
      WHERE id = optimization_recommendations.optimization_result_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recommendations through their optimization results" 
  ON public.optimization_recommendations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.optimization_results 
      WHERE id = optimization_recommendations.optimization_result_id AND user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_amazon_connections_user_id ON public.amazon_connections(user_id);
CREATE INDEX idx_campaigns_connection_id ON public.campaigns(connection_id);
CREATE INDEX idx_campaigns_amazon_id ON public.campaigns(amazon_campaign_id);
CREATE INDEX idx_adgroups_campaign_id ON public.ad_groups(campaign_id);
CREATE INDEX idx_keywords_adgroup_id ON public.keywords(adgroup_id);
CREATE INDEX idx_optimization_results_user_id ON public.optimization_results(user_id);
CREATE INDEX idx_optimization_results_connection_id ON public.optimization_results(connection_id);
CREATE INDEX idx_optimization_recommendations_result_id ON public.optimization_recommendations(optimization_result_id);

-- Database functions for Amazon API integration
CREATE OR REPLACE FUNCTION public.sync_amazon_data(connection_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update last sync timestamp
  UPDATE public.amazon_connections 
  SET last_sync_at = now(), updated_at = now()
  WHERE id = connection_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_optimization_batch(user_uuid uuid, connection_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Create new optimization result entry
  INSERT INTO public.optimization_results (user_id, connection_id, optimization_type, status)
  VALUES (user_uuid, connection_uuid, 'full_optimization', 'pending')
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;
