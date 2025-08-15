-- Create sync_jobs table for tracking sync progress
CREATE TABLE public.sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error')),
  phase TEXT,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  error_details JSONB DEFAULT '{}',
  sync_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sync jobs"
ON public.sync_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync jobs"
ON public.sync_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync jobs"
ON public.sync_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_sync_jobs_connection_id ON public.sync_jobs(connection_id);
CREATE INDEX idx_sync_jobs_user_id ON public.sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_status ON public.sync_jobs(status);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_sync_jobs_updated_at
BEFORE UPDATE ON public.sync_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();