-- Add unique constraints to history tables for proper upserts
ALTER TABLE campaign_performance_history 
ADD CONSTRAINT campaign_performance_history_unique 
UNIQUE (campaign_id, date, attribution_window);

ALTER TABLE adgroup_performance_history 
ADD CONSTRAINT adgroup_performance_history_unique 
UNIQUE (adgroup_id, date, attribution_window);

ALTER TABLE keyword_performance_history 
ADD CONSTRAINT keyword_performance_history_unique 
UNIQUE (keyword_id, date, attribution_window);

-- Add unique constraint to fact_target_daily if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fact_target_daily_unique'
  ) THEN
    ALTER TABLE fact_target_daily 
    ADD CONSTRAINT fact_target_daily_unique 
    UNIQUE (date, profile_id, target_id);
  END IF;
END $$;

-- Create archive_status table to track data archiving health
CREATE TABLE IF NOT EXISTS public.archive_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  earliest_date DATE,
  latest_date DATE,
  total_records INTEGER DEFAULT 0,
  last_archived_at TIMESTAMPTZ,
  gaps_detected JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, entity_type)
);

-- Enable RLS on archive_status
ALTER TABLE public.archive_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for archive_status
CREATE POLICY "Users can view their own archive status" 
ON public.archive_status 
FOR SELECT 
USING (
  profile_id IN (
    SELECT profile_id FROM amazon_connections WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_archive_status_updated_at
BEFORE UPDATE ON public.archive_status
FOR EACH ROW
EXECUTE FUNCTION public.safe_update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_archive_status_profile ON public.archive_status(profile_id);