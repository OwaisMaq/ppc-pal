-- Add user_id column to action_queue for direct ownership tracking
ALTER TABLE public.action_queue 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Make rule_id nullable for manual/dev actions
ALTER TABLE public.action_queue 
ALTER COLUMN rule_id DROP NOT NULL;

-- Add index for user queries
CREATE INDEX idx_action_queue_user_id ON public.action_queue(user_id);

-- Drop existing user SELECT policy
DROP POLICY IF EXISTS "Users can view their action queue" ON public.action_queue;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Users can insert their own actions"
ON public.action_queue FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create new SELECT policy that includes direct ownership
CREATE POLICY "Users can view their own actions"
ON public.action_queue FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM automation_rules ar 
    WHERE ar.id = action_queue.rule_id AND ar.user_id = auth.uid()
  )
);

-- Allow users to update their own queued actions (e.g., cancel)
CREATE POLICY "Users can update their own queued actions"
ON public.action_queue FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'queued')
WITH CHECK (user_id = auth.uid());