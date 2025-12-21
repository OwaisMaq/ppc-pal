-- Add columns to action_queue to store API response data for audit trail
ALTER TABLE action_queue 
ADD COLUMN IF NOT EXISTS amazon_request_id TEXT,
ADD COLUMN IF NOT EXISTS amazon_api_response JSONB;

-- Add index for faster queries on action history
CREATE INDEX IF NOT EXISTS idx_action_queue_profile_status ON action_queue(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_action_queue_created_at ON action_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_queue_applied_at ON action_queue(applied_at DESC NULLS LAST);

-- Add comment for documentation
COMMENT ON COLUMN action_queue.amazon_request_id IS 'Amazon API request ID for tracking and debugging';
COMMENT ON COLUMN action_queue.amazon_api_response IS 'Raw response from Amazon Advertising API';