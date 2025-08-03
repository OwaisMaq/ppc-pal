-- Clean up orphaned campaign data
-- Remove campaigns that belong to connections that no longer exist
DELETE FROM campaigns 
WHERE connection_id NOT IN (
  SELECT id FROM amazon_connections
);

-- Remove performance history for campaigns that no longer exist
DELETE FROM campaign_performance_history 
WHERE campaign_id NOT IN (
  SELECT id FROM campaigns
);

-- Remove adgroup performance history for adgroups that no longer exist
DELETE FROM adgroup_performance_history 
WHERE adgroup_id NOT IN (
  SELECT id FROM ad_groups
);

-- Remove keyword performance history for keywords that no longer exist
DELETE FROM keyword_performance_history 
WHERE keyword_id NOT IN (
  SELECT id FROM keywords
);

-- Remove ad groups that belong to campaigns that no longer exist
DELETE FROM ad_groups 
WHERE campaign_id NOT IN (
  SELECT id FROM campaigns
);

-- Remove keywords that belong to ad groups that no longer exist
DELETE FROM keywords 
WHERE adgroup_id NOT IN (
  SELECT id FROM ad_groups
);

-- Add index for better performance on connection health checks
CREATE INDEX IF NOT EXISTS idx_amazon_connections_health_status 
ON amazon_connections(health_status, last_health_check);

-- Add index for better sync performance monitoring
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_connection_success 
ON sync_performance_logs(connection_id, success, start_time);

-- Update existing connections to trigger health checks on next sync
UPDATE amazon_connections 
SET last_health_check = NULL, health_status = 'unknown'
WHERE status = 'active';