-- Remove the trigger that's causing the issue
DROP TRIGGER IF EXISTS update_sync_jobs_updated_at ON sync_jobs;

-- Clean up stuck sync jobs manually
UPDATE sync_jobs 
SET status = 'failed', 
    finished_at = now(),
    error_details = jsonb_build_object('error', 'Sync job timed out after 30 minutes', 'code', 'SYNC_TIMEOUT')
WHERE status = 'running' 
AND started_at < now() - interval '30 minutes';