-- Add missing UPDATE policy for protected_entities
CREATE POLICY "Users can update their own protected entities"
ON public.protected_entities
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add comment documenting action_queue status values including new governance statuses
COMMENT ON COLUMN public.action_queue.status IS 
  'Action status: queued, applied, failed, skipped, blocked_by_governance, requires_approval';