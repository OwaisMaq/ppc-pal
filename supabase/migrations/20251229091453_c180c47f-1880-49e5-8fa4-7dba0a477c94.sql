-- Create keyword rank tracking table
CREATE TABLE public.keyword_rank_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id text NOT NULL,
  asin text NOT NULL,
  keyword text NOT NULL,
  current_sponsored_rank integer,
  current_organic_rank integer,
  best_sponsored_rank integer,
  best_organic_rank integer,
  rank_trend integer DEFAULT 0, -- positive = improved, negative = dropped
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, asin, keyword)
);

-- Create keyword rank history table for daily snapshots
CREATE TABLE public.keyword_rank_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id uuid NOT NULL REFERENCES public.keyword_rank_tracking(id) ON DELETE CASCADE,
  profile_id text NOT NULL,
  sponsored_rank integer,
  organic_rank integer,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_keyword_rank_tracking_profile ON public.keyword_rank_tracking(profile_id);
CREATE INDEX idx_keyword_rank_tracking_asin ON public.keyword_rank_tracking(profile_id, asin);
CREATE INDEX idx_keyword_rank_history_tracking ON public.keyword_rank_history(tracking_id);
CREATE INDEX idx_keyword_rank_history_checked ON public.keyword_rank_history(tracking_id, checked_at DESC);

-- Enable RLS
ALTER TABLE public.keyword_rank_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rank_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_rank_tracking
CREATE POLICY "Users can view their tracked keywords"
  ON public.keyword_rank_tracking
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keyword_rank_tracking.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert tracked keywords"
  ON public.keyword_rank_tracking
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keyword_rank_tracking.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their tracked keywords"
  ON public.keyword_rank_tracking
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keyword_rank_tracking.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their tracked keywords"
  ON public.keyword_rank_tracking
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keyword_rank_tracking.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage rank tracking"
  ON public.keyword_rank_tracking
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for keyword_rank_history
CREATE POLICY "Users can view their rank history"
  ON public.keyword_rank_history
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amazon_connections ac
    WHERE ac.profile_id = keyword_rank_history.profile_id
    AND ac.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage rank history"
  ON public.keyword_rank_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_keyword_rank_tracking_updated_at
  BEFORE UPDATE ON public.keyword_rank_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_update_updated_at_column();