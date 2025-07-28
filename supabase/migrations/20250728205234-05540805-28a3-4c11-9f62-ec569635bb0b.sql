-- Add health monitoring and performance tracking columns to amazon_connections table
ALTER TABLE public.amazon_connections 
ADD COLUMN IF NOT EXISTS last_health_check timestamp with time zone,
ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS health_issues text[];

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_amazon_connections_health_status ON public.amazon_connections(health_status);
CREATE INDEX IF NOT EXISTS idx_amazon_connections_last_health_check ON public.amazon_connections(last_health_check);

-- Add performance tracking table for monitoring sync operations
CREATE TABLE IF NOT EXISTS public.sync_performance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
  operation_type text NOT NULL DEFAULT 'sync',
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  total_duration_ms integer,
  phases jsonb,
  campaigns_processed integer DEFAULT 0,
  success boolean DEFAULT false,
  error_message text,
  performance_metrics jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on sync_performance_logs
ALTER TABLE public.sync_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_performance_logs
CREATE POLICY "Users can view sync logs through their connections" 
ON public.sync_performance_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.amazon_connections 
    WHERE amazon_connections.id = sync_performance_logs.connection_id 
    AND amazon_connections.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert sync logs" 
ON public.sync_performance_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_connection_id ON public.sync_performance_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_start_time ON public.sync_performance_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_success ON public.sync_performance_logs(success);

-- Add comment to explain the new table
COMMENT ON TABLE public.sync_performance_logs IS 'Tracks performance metrics and logs for Amazon data sync operations';