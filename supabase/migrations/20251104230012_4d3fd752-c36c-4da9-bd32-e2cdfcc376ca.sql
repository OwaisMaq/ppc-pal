-- Create pending Amazon reports table for async report polling
CREATE TABLE IF NOT EXISTS pending_amazon_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES amazon_connections(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES sync_jobs(id) ON DELETE SET NULL,
  report_id text NOT NULL,
  report_type text NOT NULL, -- 'campaign_14d', 'adgroup_14d', 'target_14d', etc.
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at timestamptz NOT NULL DEFAULT now(),
  last_polled_at timestamptz,
  completed_at timestamptz,
  download_url text,
  error_details text,
  poll_count integer DEFAULT 0,
  configuration jsonb
);

-- Enable RLS
ALTER TABLE pending_amazon_reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports for their connections
CREATE POLICY "Users can view pending reports via their connections"
  ON pending_amazon_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM amazon_connections ac
      WHERE ac.id = pending_amazon_reports.connection_id
      AND ac.user_id = auth.uid()
    )
  );

-- Service role can manage all reports
CREATE POLICY "Service role can manage pending reports"
  ON pending_amazon_reports FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for efficient querying
CREATE INDEX idx_pending_reports_status ON pending_amazon_reports(status);
CREATE INDEX idx_pending_reports_connection ON pending_amazon_reports(connection_id);
CREATE INDEX idx_pending_reports_created ON pending_amazon_reports(created_at);
CREATE INDEX idx_pending_reports_type ON pending_amazon_reports(report_type);