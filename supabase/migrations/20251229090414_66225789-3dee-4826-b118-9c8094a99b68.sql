-- Campaign Templates table for storing reusable campaign configurations
CREATE TABLE public.campaign_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template configuration
  template_type TEXT NOT NULL DEFAULT 'balanced', -- aggressive, balanced, conservative
  structure JSONB NOT NULL DEFAULT '{}'::jsonb, -- Campaign structure config
  
  -- ASIN and product info
  asin TEXT NOT NULL,
  product_name TEXT,
  product_price NUMERIC,
  
  -- Budget settings
  daily_budget NUMERIC NOT NULL DEFAULT 50,
  default_bid NUMERIC NOT NULL DEFAULT 0.75,
  
  -- Generated campaigns
  campaigns_created JSONB, -- Array of created campaign IDs
  rules_created JSONB, -- Array of created harvesting rule IDs
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, creating, active, failed
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own templates"
  ON public.campaign_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all templates"
  ON public.campaign_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_campaign_templates_user_id ON public.campaign_templates(user_id);
CREATE INDEX idx_campaign_templates_profile_id ON public.campaign_templates(profile_id);
CREATE INDEX idx_campaign_templates_status ON public.campaign_templates(status);

-- Updated at trigger
CREATE TRIGGER update_campaign_templates_updated_at
  BEFORE UPDATE ON public.campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();