-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS budget_type text;

-- Add missing connection_id column to targets table
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

-- Add missing campaign_id column to keywords table  
ALTER TABLE public.keywords
ADD COLUMN IF NOT EXISTS campaign_id text;