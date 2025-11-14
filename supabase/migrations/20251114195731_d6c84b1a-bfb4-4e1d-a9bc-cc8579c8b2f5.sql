-- Drop old connection_id-based RLS policies from keywords table
DROP POLICY IF EXISTS "Users can view keywords through their ad groups" ON keywords;
DROP POLICY IF EXISTS "Users can update keywords through their ad groups" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords through their ad groups" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords through their ad groups" ON keywords;

-- Drop old connection_id-based RLS policies from targets table
DROP POLICY IF EXISTS "Users can view targets through their ad groups" ON targets;
DROP POLICY IF EXISTS "Users can update targets through their ad groups" ON targets;
DROP POLICY IF EXISTS "Users can delete targets through their ad groups" ON targets;
DROP POLICY IF EXISTS "Users can insert targets through their ad groups" ON targets;

-- Verify the new profile_id-based policies remain (these should already exist from previous migrations)
-- If for some reason they don't exist, create them:

-- Keywords policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keywords' AND policyname = 'Users can view keywords via profile connections') THEN
    CREATE POLICY "Users can view keywords via profile connections"
    ON keywords FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = keywords.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keywords' AND policyname = 'Users can insert keywords via profile connections') THEN
    CREATE POLICY "Users can insert keywords via profile connections"
    ON keywords FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = keywords.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keywords' AND policyname = 'Users can update keywords via profile connections') THEN
    CREATE POLICY "Users can update keywords via profile connections"
    ON keywords FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = keywords.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keywords' AND policyname = 'Users can delete keywords via profile connections') THEN
    CREATE POLICY "Users can delete keywords via profile connections"
    ON keywords FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = keywords.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;
END $$;

-- Targets policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'targets' AND policyname = 'Users can view targets via profile connections') THEN
    CREATE POLICY "Users can view targets via profile connections"
    ON targets FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = targets.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'targets' AND policyname = 'Users can insert targets via profile connections') THEN
    CREATE POLICY "Users can insert targets via profile connections"
    ON targets FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = targets.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'targets' AND policyname = 'Users can update targets via profile connections') THEN
    CREATE POLICY "Users can update targets via profile connections"
    ON targets FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = targets.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'targets' AND policyname = 'Users can delete targets via profile connections') THEN
    CREATE POLICY "Users can delete targets via profile connections"
    ON targets FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.profile_id = targets.profile_id
      AND ac.user_id = auth.uid()
    ));
  END IF;
END $$;