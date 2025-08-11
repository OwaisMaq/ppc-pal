-- Add campaign_count to track synced campaigns per connection
ALTER TABLE public.amazon_connections
ADD COLUMN IF NOT EXISTS campaign_count integer DEFAULT 0;