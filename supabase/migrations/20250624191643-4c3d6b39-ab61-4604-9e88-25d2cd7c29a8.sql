
-- Create the missing unique constraint that the upsert operation expects
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_amazon_campaign_id_connection_id_unique 
UNIQUE (amazon_campaign_id, connection_id);

-- Add an index to improve performance on lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_amazon_id_connection 
ON campaigns (amazon_campaign_id, connection_id);

-- Add an index for data_source filtering (used in performance calculations)
CREATE INDEX IF NOT EXISTS idx_campaigns_data_source 
ON campaigns (data_source);

-- Add an index for connection_id filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_connection_id 
ON campaigns (connection_id);
