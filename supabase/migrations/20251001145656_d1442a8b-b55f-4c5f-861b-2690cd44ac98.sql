-- Add bid_strategy column to campaigns table to support Amazon Advertising API v3
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS bid_strategy text;