-- Create table to track Amazon report requests and their status
CREATE TABLE public.amazon_report_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE,
  connection_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  status_details TEXT,
  download_url TEXT,
  file_size BIGINT,
  configuration JSONB,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.amazon_report_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for report requests
CREATE POLICY "Users can view report requests through their connections"
ON public.amazon_report_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections
    WHERE amazon_connections.id = amazon_report_requests.connection_id
    AND amazon_connections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert report requests through their connections"
ON public.amazon_report_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections
    WHERE amazon_connections.id = amazon_report_requests.connection_id
    AND amazon_connections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update report requests through their connections"
ON public.amazon_report_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections
    WHERE amazon_connections.id = amazon_report_requests.connection_id
    AND amazon_connections.user_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX idx_amazon_report_requests_connection_id ON public.amazon_report_requests(connection_id);
CREATE INDEX idx_amazon_report_requests_status ON public.amazon_report_requests(status);
CREATE INDEX idx_amazon_report_requests_created_at ON public.amazon_report_requests(created_at DESC);