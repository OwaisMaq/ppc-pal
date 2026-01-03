-- Create product_governance table for per-product automation targets
CREATE TABLE public.product_governance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  asin TEXT NOT NULL,
  target_acos NUMERIC,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, asin)
);

-- Enable Row Level Security
ALTER TABLE public.product_governance ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own product governance settings" 
ON public.product_governance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product governance settings" 
ON public.product_governance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product governance settings" 
ON public.product_governance 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product governance settings" 
ON public.product_governance 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_governance_updated_at
BEFORE UPDATE ON public.product_governance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();