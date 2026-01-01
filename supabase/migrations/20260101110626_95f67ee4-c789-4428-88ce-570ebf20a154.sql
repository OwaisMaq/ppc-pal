-- Allow users to insert bid_states for their profiles (via amazon_connections)
CREATE POLICY "Users can insert bid_states for their profiles"
ON public.bid_states
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_states.profile_id
    AND ac.user_id = auth.uid()
  )
);

-- Allow users to update bid_states for their profiles (via amazon_connections)
CREATE POLICY "Users can update bid_states for their profiles"
ON public.bid_states
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_states.profile_id
    AND ac.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = bid_states.profile_id
    AND ac.user_id = auth.uid()
  )
);