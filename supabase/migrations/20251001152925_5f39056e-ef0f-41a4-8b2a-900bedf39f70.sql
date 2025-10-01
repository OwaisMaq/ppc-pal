-- Add missing connection_id column to keywords table
ALTER TABLE public.keywords 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.amazon_connections(id) ON DELETE CASCADE;

-- Add missing updated_at column to targets table
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for targets updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_targets_updated_at'
  ) THEN
    CREATE TRIGGER update_targets_updated_at
    BEFORE UPDATE ON public.targets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Add comment to force schema reload
COMMENT ON TABLE public.campaigns IS 'Campaign data from Amazon Ads - schema updated';

-- Notify Postgrest to reload schema
NOTIFY pgrst, 'reload schema';