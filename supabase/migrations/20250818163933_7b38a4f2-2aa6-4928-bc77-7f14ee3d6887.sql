-- Add per-connection destination settings for AMS
ALTER TABLE public.amazon_connections
  ADD COLUMN IF NOT EXISTS streams_destination_arn text,
  ADD COLUMN IF NOT EXISTS streams_region text;

-- Make it easy to see if streams are configured
ALTER TABLE public.amazon_connections
  ADD COLUMN IF NOT EXISTS streams_configured boolean GENERATED ALWAYS AS (
    (streams_destination_arn IS NOT NULL AND streams_region IS NOT NULL)
  ) STORED;