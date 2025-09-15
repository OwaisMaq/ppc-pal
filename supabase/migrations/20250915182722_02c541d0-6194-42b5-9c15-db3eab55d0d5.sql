-- Add sync job timeout functionality to prevent stuck jobs
UPDATE sync_jobs 
SET status = 'failed', 
    finished_at = now(),
    error_details = jsonb_build_object('error', 'Sync job timed out after 30 minutes', 'code', 'SYNC_TIMEOUT')
WHERE status = 'running' 
AND started_at < now() - interval '30 minutes';

-- Create function to clean up stuck sync jobs
CREATE OR REPLACE FUNCTION public.cleanup_stuck_sync_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE sync_jobs 
  SET status = 'failed', 
      finished_at = now(),
      error_details = jsonb_build_object('error', 'Sync job timed out', 'code', 'SYNC_TIMEOUT')
  WHERE status = 'running' 
  AND started_at < now() - interval '30 minutes';
END;
$function$;