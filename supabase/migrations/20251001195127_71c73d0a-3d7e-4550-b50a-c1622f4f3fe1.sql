-- Fix campaign_status enum to include Amazon's status values
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'archived';

-- Add comment to trigger schema reload
COMMENT ON TYPE campaign_status IS 'Campaign status enum - updated 2025-10-01T19:50:00Z';