-- Add optimization_enabled column to bid_states table
ALTER TABLE public.bid_states 
ADD COLUMN IF NOT EXISTS optimization_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bid_states_optimization 
ON public.bid_states(profile_id, entity_type, optimization_enabled);