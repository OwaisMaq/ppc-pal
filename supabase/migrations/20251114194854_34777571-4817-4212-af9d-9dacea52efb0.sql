-- Phase 1: Add profile_id columns to campaigns, ad_groups, and keywords
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS profile_id TEXT;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS profile_id TEXT;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS profile_id TEXT;

-- Phase 2: Backfill profile_id from amazon_connections
UPDATE campaigns c
SET profile_id = ac.profile_id
FROM amazon_connections ac
WHERE c.connection_id = ac.id AND c.profile_id IS NULL;

UPDATE ad_groups ag
SET profile_id = ac.profile_id
FROM campaigns c
JOIN amazon_connections ac ON c.connection_id = ac.id
WHERE ag.campaign_id = c.id AND ag.profile_id IS NULL;

UPDATE keywords k
SET profile_id = ag.profile_id
FROM ad_groups ag
WHERE k.adgroup_id = ag.id AND k.profile_id IS NULL;

-- Phase 3: Delete duplicate campaigns (keep newest per profile + amazon_campaign_id)
DELETE FROM campaigns c1
WHERE c1.id NOT IN (
  SELECT DISTINCT ON (profile_id, amazon_campaign_id) id
  FROM campaigns
  WHERE profile_id IS NOT NULL
  ORDER BY profile_id, amazon_campaign_id, created_at DESC
);

-- Phase 4: Delete duplicate ad_groups (keep newest per profile + amazon_adgroup_id)
DELETE FROM ad_groups ag1
WHERE ag1.id NOT IN (
  SELECT DISTINCT ON (profile_id, amazon_adgroup_id) id
  FROM ad_groups
  WHERE profile_id IS NOT NULL
  ORDER BY profile_id, amazon_adgroup_id, created_at DESC
);

-- Phase 5: Delete duplicate keywords (keep newest per profile + amazon_keyword_id)
DELETE FROM keywords k1
WHERE k1.id NOT IN (
  SELECT DISTINCT ON (profile_id, amazon_keyword_id) id
  FROM keywords
  WHERE profile_id IS NOT NULL
  ORDER BY profile_id, amazon_keyword_id, created_at DESC
);

-- Phase 6: Make profile_id NOT NULL
ALTER TABLE campaigns ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE ad_groups ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE keywords ALTER COLUMN profile_id SET NOT NULL;

-- Phase 7: Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_unique_profile_amazon 
ON campaigns(profile_id, amazon_campaign_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adgroups_unique_profile_amazon 
ON ad_groups(profile_id, amazon_adgroup_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_unique_profile_amazon 
ON keywords(profile_id, amazon_keyword_id);

-- Phase 8: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_profile_id ON campaigns(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_profile_status ON campaigns(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_adgroups_profile_id ON ad_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_keywords_profile_id ON keywords(profile_id);

-- Phase 9: Drop all existing policies before recreating them
DROP POLICY IF EXISTS "Users can view campaigns through their connections" ON campaigns;
DROP POLICY IF EXISTS "Users can insert campaigns through their connections" ON campaigns;
DROP POLICY IF EXISTS "Users can update campaigns through their connections" ON campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns through their connections" ON campaigns;
DROP POLICY IF EXISTS "Users can view campaigns via profile connections" ON campaigns;
DROP POLICY IF EXISTS "Users can insert campaigns via profile connections" ON campaigns;
DROP POLICY IF EXISTS "Users can update campaigns via profile connections" ON campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns via profile connections" ON campaigns;

DROP POLICY IF EXISTS "Users can view ad groups through their campaigns" ON ad_groups;
DROP POLICY IF EXISTS "Users can insert ad groups through their campaigns" ON ad_groups;
DROP POLICY IF EXISTS "Users can update ad groups through their campaigns" ON ad_groups;
DROP POLICY IF EXISTS "Users can delete ad groups through their campaigns" ON ad_groups;
DROP POLICY IF EXISTS "Users can view ad groups via profile connections" ON ad_groups;
DROP POLICY IF EXISTS "Users can insert ad groups via profile connections" ON ad_groups;
DROP POLICY IF EXISTS "Users can update ad groups via profile connections" ON ad_groups;
DROP POLICY IF EXISTS "Users can delete ad groups via profile connections" ON ad_groups;

DROP POLICY IF EXISTS "Users can view keywords through their adgroups" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords through their adgroups" ON keywords;
DROP POLICY IF EXISTS "Users can update keywords through their adgroups" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords through their adgroups" ON keywords;
DROP POLICY IF EXISTS "Users can view keywords via profile connections" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords via profile connections" ON keywords;
DROP POLICY IF EXISTS "Users can update keywords via profile connections" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords via profile connections" ON keywords;

-- Create new profile-based RLS policies for campaigns
CREATE POLICY "Users can view campaigns via profile connections"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = campaigns.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert campaigns via profile connections"
ON campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = campaigns.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update campaigns via profile connections"
ON campaigns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = campaigns.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete campaigns via profile connections"
ON campaigns FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = campaigns.profile_id
    AND ac.user_id = auth.uid()
  )
);

-- Create new profile-based RLS policies for ad_groups
CREATE POLICY "Users can view ad groups via profile connections"
ON ad_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = ad_groups.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert ad groups via profile connections"
ON ad_groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = ad_groups.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update ad groups via profile connections"
ON ad_groups FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = ad_groups.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete ad groups via profile connections"
ON ad_groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = ad_groups.profile_id
    AND ac.user_id = auth.uid()
  )
);

-- Create new profile-based RLS policies for keywords
CREATE POLICY "Users can view keywords via profile connections"
ON keywords FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keywords.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert keywords via profile connections"
ON keywords FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keywords.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update keywords via profile connections"
ON keywords FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keywords.profile_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete keywords via profile connections"
ON keywords FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keywords.profile_id
    AND ac.user_id = auth.uid()
  )
);