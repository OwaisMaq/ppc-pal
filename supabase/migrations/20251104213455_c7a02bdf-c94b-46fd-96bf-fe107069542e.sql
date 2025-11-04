-- Add unique constraint to ams_subscriptions table for upsert operations
ALTER TABLE ams_subscriptions 
ADD CONSTRAINT ams_subscriptions_connection_dataset_unique 
UNIQUE (connection_id, dataset_id);