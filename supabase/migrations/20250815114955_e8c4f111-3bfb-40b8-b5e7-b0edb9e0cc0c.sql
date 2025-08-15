-- Create asin_labels table for custom ASIN labels
CREATE TABLE public.asin_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asin)
);

-- Enable Row Level Security
ALTER TABLE public.asin_labels ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own ASIN labels" 
ON public.asin_labels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ASIN labels" 
ON public.asin_labels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ASIN labels" 
ON public.asin_labels 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ASIN labels" 
ON public.asin_labels 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_asin_labels_updated_at
BEFORE UPDATE ON public.asin_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();