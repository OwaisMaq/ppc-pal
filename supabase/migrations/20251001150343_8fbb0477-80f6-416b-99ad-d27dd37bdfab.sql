-- Add campaign_id column to targets table to store campaign relationships
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS campaign_id text;