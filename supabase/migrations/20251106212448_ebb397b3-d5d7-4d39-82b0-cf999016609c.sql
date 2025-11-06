-- Clean up stuck processing reports
UPDATE pending_amazon_reports 
SET status = 'completed', completed_at = NOW()
WHERE status = 'processing' 
AND poll_count > 50;

-- Delete duplicate report entries (keep only the most recent one per report_id)
DELETE FROM pending_amazon_reports a
USING pending_amazon_reports b
WHERE a.id < b.id 
AND a.report_id = b.report_id;

-- Add unique constraint to prevent duplicate report_id entries
ALTER TABLE pending_amazon_reports
ADD CONSTRAINT pending_amazon_reports_report_id_unique UNIQUE (report_id);

-- Create index on status and last_polled_at for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_reports_status_polled 
ON pending_amazon_reports(status, last_polled_at) 
WHERE status IN ('pending', 'processing');