-- Add missing SELECT RLS policies for ad_groups and keywords

-- Add SELECT policy for ad_groups
CREATE POLICY "Users can view ad groups through their campaigns" 
ON public.ad_groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.amazon_connections ac ON (c.connection_id = ac.id)
    WHERE c.id = ad_groups.campaign_id
      AND ac.user_id = auth.uid()
  )
);

-- Add SELECT policy for keywords  
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