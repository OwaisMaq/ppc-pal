-- Create enum for source types first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documentation_source_type') THEN
        CREATE TYPE documentation_source_type AS ENUM ('manual', 'openapi', 'github', 'rss', 'crawler');
    END IF;
END $$;

-- Add new columns to documentation_sources table
ALTER TABLE public.documentation_sources 
ADD COLUMN IF NOT EXISTS source_type_new documentation_source_type DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS api_spec_data jsonb,
ADD COLUMN IF NOT EXISTS github_repo text,
ADD COLUMN IF NOT EXISTS github_branch text DEFAULT 'main',
ADD COLUMN IF NOT EXISTS parsing_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_analysis_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS analysis_results jsonb;

-- Copy existing data and update the new column
UPDATE public.documentation_sources 
SET source_type_new = 'manual' 
WHERE source_type_new IS NULL;

-- Drop the old column and rename the new one
ALTER TABLE public.documentation_sources 
DROP COLUMN IF EXISTS source_type,
RENAME COLUMN source_type_new TO source_type;

-- Create API analysis results table
CREATE TABLE IF NOT EXISTS public.api_analysis_results (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    documentation_source_id uuid NOT NULL,
    analysis_type text NOT NULL,
    results jsonb NOT NULL DEFAULT '{}',
    recommendations jsonb DEFAULT '[]',
    confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create code validation results table
CREATE TABLE IF NOT EXISTS public.code_validation_results (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    file_path text NOT NULL,
    validation_type text NOT NULL,
    api_spec_reference uuid,
    issues jsonb DEFAULT '[]',
    compliance_score numeric CHECK (compliance_score >= 0 AND compliance_score <= 1),
    recommendations jsonb DEFAULT '[]',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create best practices library table
CREATE TABLE IF NOT EXISTS public.api_best_practices (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    rule_pattern text,
    severity text NOT NULL DEFAULT 'medium',
    api_version text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for new tables
ALTER TABLE public.api_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_best_practices ENABLE ROW LEVEL SECURITY;

-- API analysis results policies
CREATE POLICY "Service role can manage API analysis results" 
ON public.api_analysis_results 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "API analysis results are viewable by authenticated users" 
ON public.api_analysis_results 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Code validation results policies
CREATE POLICY "Users can view their own code validation results" 
ON public.code_validation_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own code validation results" 
ON public.code_validation_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own code validation results" 
ON public.code_validation_results 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Best practices policies
CREATE POLICY "Best practices are viewable by authenticated users" 
ON public.api_best_practices 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage best practices" 
ON public.api_best_practices 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add triggers for updated_at columns
CREATE TRIGGER update_api_analysis_results_updated_at
    BEFORE UPDATE ON public.api_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_code_validation_results_updated_at
    BEFORE UPDATE ON public.code_validation_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_best_practices_updated_at
    BEFORE UPDATE ON public.api_best_practices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial best practices for Amazon Ads API
INSERT INTO public.api_best_practices (category, title, description, rule_pattern, severity, api_version) VALUES
('authentication', 'Token Refresh Management', 'Implement proper token refresh logic before expiration', 'refresh.*token.*before.*expir', 'high', 'v3'),
('rate_limiting', 'Rate Limit Handling', 'Implement exponential backoff for rate limit responses', 'rate.*limit.*backoff|429.*retry', 'high', 'v3'),
('error_handling', 'API Error Response Handling', 'Handle all documented error response codes appropriately', 'error.*handling.*\d{3}', 'medium', 'v3'),
('data_validation', 'Request Payload Validation', 'Validate request payloads against API schema', 'validate.*request.*schema', 'medium', 'v3'),
('pagination', 'Pagination Implementation', 'Use proper pagination for large data sets', 'pagination.*nextToken|offset.*limit', 'medium', 'v3'),
('logging', 'API Request Logging', 'Log API requests and responses for debugging', 'log.*api.*request|response.*log', 'low', 'v3')
ON CONFLICT DO NOTHING;