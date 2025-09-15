-- Create a function to handle sync job cleanup and validation
CREATE OR REPLACE FUNCTION public.cleanup_and_create_sync_job(p_connection_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_job_id uuid;
BEGIN
  -- First, clean up any existing running jobs for this connection
  UPDATE sync_jobs 
  SET status = 'failed',
      finished_at = now(),
      error_details = jsonb_build_object('error', 'Cancelled by new sync request', 'code', 'CANCELLED')
  WHERE connection_id = p_connection_id 
  AND status = 'running';

  -- Create new sync job
  INSERT INTO sync_jobs (connection_id, user_id, status, started_at, progress_percent)
  VALUES (p_connection_id, p_user_id, 'running', now(), 0)
  RETURNING id INTO new_job_id;

  RETURN new_job_id;
END;
$function$;