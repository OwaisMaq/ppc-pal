-- Enable realtime for sync_jobs table
ALTER TABLE sync_jobs REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sync_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sync_jobs;
  END IF;
END $$;