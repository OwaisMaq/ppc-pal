
-- Add campaign count and setup reason tracking to amazon_connections
ALTER TABLE public.amazon_connections 
ADD COLUMN IF NOT EXISTS campaign_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_required_reason TEXT;

-- Update existing connections to have default values
UPDATE public.amazon_connections 
SET campaign_count = 0 
WHERE campaign_count IS NULL;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_amazon_connections_status 
ON public.amazon_connections(status);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_amazon_connections_user_status 
ON public.amazon_connections(user_id, status);
