-- Create table for OAuth state management
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'amazon',
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for fast state lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);

-- Create index for cleanup by expiration
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage oauth states
CREATE POLICY "Service role can manage oauth states" 
ON public.oauth_states 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow users to view their own oauth states
CREATE POLICY "Users can view their own oauth states" 
ON public.oauth_states 
FOR SELECT 
USING (auth.uid() = user_id);