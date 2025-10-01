-- Add campaign_id column to store Amazon's campaign identifier
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS campaign_id text;