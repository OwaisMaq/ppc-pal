
-- Fix campaigns table schema to match sync function expectations
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update the trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for campaigns table
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also add missing foreign key constraints that should exist
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_connection_id_fkey 
FOREIGN KEY (connection_id) REFERENCES amazon_connections(id) ON DELETE CASCADE;

ALTER TABLE ad_groups
ADD CONSTRAINT ad_groups_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE keywords
ADD CONSTRAINT keywords_adgroup_id_fkey 
FOREIGN KEY (adgroup_id) REFERENCES ad_groups(id) ON DELETE CASCADE;

ALTER TABLE campaign_metrics_history
ADD CONSTRAINT campaign_metrics_history_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
