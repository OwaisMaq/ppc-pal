-- Create ams_subscriptions table if it doesn't exist already
-- This ensures subscription persistence for the AMS setup UI

-- First, check if the table exists and has the right structure
CREATE TABLE IF NOT EXISTS public.ams_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL,
  dataset_id text NOT NULL CHECK (dataset_id IN ('sp-traffic', 'sp-conversion')),
  destination_type text CHECK (destination_type IN ('firehose', 'sqs', 'kinesis')),
  destination_arn text,
  region text,
  status text NOT NULL DEFAULT 'active',
  subscription_id text, -- Amazon subscription ID from Streams API
  last_delivery_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ams_subscriptions_connection_id_fkey'
  ) THEN
    ALTER TABLE public.ams_subscriptions 
    ADD CONSTRAINT ams_subscriptions_connection_id_fkey 
    FOREIGN KEY (connection_id) REFERENCES public.amazon_connections(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ams_subscriptions_connection 
ON public.ams_subscriptions(connection_id);

-- Create unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_ams_subscriptions_unique 
ON public.ams_subscriptions(connection_id, dataset_id) 
WHERE status = 'active';

-- Add trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_ams_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ams_subscriptions_updated_at ON public.ams_subscriptions;
CREATE TRIGGER update_ams_subscriptions_updated_at
  BEFORE UPDATE ON public.ams_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_ams_subscriptions_updated_at();