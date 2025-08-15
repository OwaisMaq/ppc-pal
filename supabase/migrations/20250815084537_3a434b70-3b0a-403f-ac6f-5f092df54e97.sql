-- Phase 1: Update raw AMS data tables to use Amazon's exact field names

-- Update ams_messages_sp_traffic to use Amazon's exact field names
ALTER TABLE ams_messages_sp_traffic 
RENAME COLUMN spend TO cost;

-- Update ams_messages_sp_conversion to use Amazon's exact field names  
ALTER TABLE ams_messages_sp_conversion
RENAME COLUMN sales TO attributed_sales;

ALTER TABLE ams_messages_sp_conversion
RENAME COLUMN orders TO attributed_conversions;

-- Phase 2: Update aggregated tables to use attribution window suffixes

-- Update campaigns table with attribution window suffixes
ALTER TABLE campaigns
ADD COLUMN cost_1d numeric DEFAULT 0,
ADD COLUMN cost_7d_new numeric DEFAULT 0,
ADD COLUMN cost_14d_new numeric DEFAULT 0,
ADD COLUMN cost_30d numeric DEFAULT 0,
ADD COLUMN attributed_sales_1d numeric DEFAULT 0,
ADD COLUMN attributed_sales_7d_new numeric DEFAULT 0,
ADD COLUMN attributed_sales_14d_new numeric DEFAULT 0,  
ADD COLUMN attributed_sales_30d numeric DEFAULT 0,
ADD COLUMN attributed_conversions_1d integer DEFAULT 0,
ADD COLUMN attributed_conversions_7d_new integer DEFAULT 0,
ADD COLUMN attributed_conversions_14d_new integer DEFAULT 0,
ADD COLUMN attributed_conversions_30d integer DEFAULT 0;

-- Copy data from old columns to new attribution-specific columns
UPDATE campaigns SET 
  cost_7d_new = spend_7d,
  cost_14d_new = spend_14d,
  attributed_sales_7d_new = sales_7d,
  attributed_sales_14d_new = sales_14d,
  attributed_conversions_7d_new = orders_7d,
  attributed_conversions_14d_new = orders_14d;

-- Drop old columns 
ALTER TABLE campaigns 
DROP COLUMN spend_7d;
ALTER TABLE campaigns 
DROP COLUMN spend_14d;
ALTER TABLE campaigns 
DROP COLUMN sales_7d;
ALTER TABLE campaigns 
DROP COLUMN sales_14d;
ALTER TABLE campaigns 
DROP COLUMN orders_7d;
ALTER TABLE campaigns 
DROP COLUMN orders_14d;

-- Rename new columns
ALTER TABLE campaigns
RENAME COLUMN cost_7d_new TO cost_7d;
ALTER TABLE campaigns
RENAME COLUMN cost_14d_new TO cost_14d;
ALTER TABLE campaigns
RENAME COLUMN attributed_sales_7d_new TO attributed_sales_7d;
ALTER TABLE campaigns
RENAME COLUMN attributed_sales_14d_new TO attributed_sales_14d;
ALTER TABLE campaigns
RENAME COLUMN attributed_conversions_7d_new TO attributed_conversions_7d;
ALTER TABLE campaigns
RENAME COLUMN attributed_conversions_14d_new TO attributed_conversions_14d;

-- Update legacy columns to match new naming (keeping for backward compatibility)
ALTER TABLE campaigns
RENAME COLUMN spend TO cost_legacy;
ALTER TABLE campaigns
RENAME COLUMN sales TO attributed_sales_legacy;
ALTER TABLE campaigns
RENAME COLUMN orders TO attributed_conversions_legacy;