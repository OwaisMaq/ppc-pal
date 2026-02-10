
-- Create client_errors table for logging frontend errors
CREATE TABLE public.client_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_message TEXT NOT NULL,
  component_stack TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Users can insert their own errors
CREATE POLICY "Users can insert their own errors"
ON public.client_errors
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all errors (users cannot view)
CREATE POLICY "Service role can view all errors"
ON public.client_errors
FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
));

-- Add nps_prompted_at to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nps_prompted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN nps_prompted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
