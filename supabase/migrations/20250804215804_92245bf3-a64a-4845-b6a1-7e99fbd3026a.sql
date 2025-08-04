-- Create table for storing scraped documentation
CREATE TABLE public.documentation_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'markdown',
  last_scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_hash TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentation_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for documentation sources
CREATE POLICY "Documentation sources are viewable by authenticated users" 
ON public.documentation_sources 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage documentation sources" 
ON public.documentation_sources 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create table for tracking documentation sync jobs
CREATE TABLE public.documentation_sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  sources_processed INTEGER DEFAULT 0,
  sources_updated INTEGER DEFAULT 0,
  sources_failed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for sync jobs
ALTER TABLE public.documentation_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync jobs
CREATE POLICY "Sync jobs are viewable by authenticated users" 
ON public.documentation_sync_jobs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage sync jobs" 
ON public.documentation_sync_jobs 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_documentation_sources_updated_at
BEFORE UPDATE ON public.documentation_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_documentation_updated_at();

-- Insert initial Amazon Ads API documentation URLs
INSERT INTO public.documentation_sources (url, title, content, version_hash) VALUES
('https://advertising.amazon.com/API/docs/en-us/reference/api-overview', 'Amazon Ads API Overview', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/overview', 'Amazon Ads API Concepts', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/errors', 'Amazon Ads API Error Handling', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/rate-limiting', 'Amazon Ads API Rate Limiting', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/campaigns', 'Amazon Ads Campaign Models', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/ad-groups', 'Amazon Ads Ad Group Models', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/targets', 'Amazon Ads Target Models', 'Placeholder content - will be updated by sync job', 'initial'),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/ads', 'Amazon Ads Models', 'Placeholder content - will be updated by sync job', 'initial');