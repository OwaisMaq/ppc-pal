-- Add all missing columns needed by the sync edge function

-- ad_groups table
ALTER TABLE public.ad_groups 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.amazon_connections(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS campaign_targeting_type text;

-- Update status column name conflict (edge function uses 'state', table has 'status')
-- We'll keep status and map it in the edge function instead

-- keywords table - connection_id was already added
-- No changes needed

-- targets table - add missing expression columns
ALTER TABLE public.targets
ADD COLUMN IF NOT EXISTS expression_type text,
ADD COLUMN IF NOT EXISTS expression_value text;

-- Force Postgrest schema cache reload by notifying  
NOTIFY pgrst, 'reload schema';