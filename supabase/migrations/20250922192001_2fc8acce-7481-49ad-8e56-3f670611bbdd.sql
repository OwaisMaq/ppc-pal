-- Fix sync_jobs table to add missing updated_at column that triggers expect
ALTER TABLE sync_jobs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sync_jobs table
DROP TRIGGER IF EXISTS sync_jobs_updated_at_trigger ON sync_jobs;
CREATE TRIGGER sync_jobs_updated_at_trigger
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_jobs_updated_at();