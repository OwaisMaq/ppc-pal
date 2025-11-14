-- Add profile_id to targets table
ALTER TABLE targets ADD COLUMN IF NOT EXISTS profile_id TEXT;

-- Backfill profile_id from ad_groups
UPDATE targets t
SET profile_id = ag.profile_id
FROM ad_groups ag
WHERE t.adgroup_id = ag.id AND t.profile_id IS NULL;

-- Delete duplicate targets (keep newest per profile + amazon_target_id)
DELETE FROM targets t1
WHERE t1.id NOT IN (
  SELECT DISTINCT ON (profile_id, amazon_target_id) id
  FROM targets
  WHERE profile_id IS NOT NULL
  ORDER BY profile_id, amazon_target_id, created_at DESC
);

-- Make profile_id NOT NULL
ALTER TABLE targets ALTER COLUMN profile_id SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_unique_profile_amazon 
ON targets(profile_id, amazon_target_id);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_targets_profile_id ON targets(profile_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view keywords through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can insert keywords through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can update keywords through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can delete keywords through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can view targets through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can insert targets through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can update targets through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can delete targets through their adgroups" ON targets;
DROP POLICY IF EXISTS "Users can view targets via profile connections" ON targets;
DROP POLICY IF EXISTS "Users can insert targets via profile connections" ON targets;
DROP POLICY IF EXISTS "Users can update targets via profile connections" ON targets;
DROP POLICY IF EXISTS "Users can delete targets via profile connections" ON targets;

-- Create new profile-based RLS policies for targets
CREATE POLICY "Users can view targets via profile connections"
ON targets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = targets.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert targets via profile connections"
ON targets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = targets.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update targets via profile connections"
ON targets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = targets.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete targets via profile connections"
ON targets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = targets.profile_id
    AND ac.user_id = auth.uid()
  )
);