-- Add SELECT policy for keywords (ad_groups policy already exists)
CREATE POLICY "Users can view keywords through their ad groups"
ON public.keywords
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ad_groups ag
    JOIN public.campaigns c ON (c.id = ag.campaign_id)
    JOIN public.amazon_connections ac ON (c.connection_id = ac.id)
    WHERE ag.id = keywords.adgroup_id
      AND ac.user_id = auth.uid()
  )
);