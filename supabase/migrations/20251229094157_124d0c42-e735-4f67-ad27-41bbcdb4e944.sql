-- Add score, grade, score_breakdown, and trend columns to historical_audits table
ALTER TABLE public.historical_audits
ADD COLUMN IF NOT EXISTS score numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grade text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trend_vs_prior_month text DEFAULT NULL;

-- Add check constraint for grade values
ALTER TABLE public.historical_audits
ADD CONSTRAINT historical_audits_grade_check 
CHECK (grade IS NULL OR grade IN ('A', 'B', 'C', 'D', 'F'));

-- Add check constraint for trend values
ALTER TABLE public.historical_audits
ADD CONSTRAINT historical_audits_trend_check 
CHECK (trend_vs_prior_month IS NULL OR trend_vs_prior_month IN ('up', 'down', 'stable', 'new'));

-- Add comment for documentation
COMMENT ON COLUMN public.historical_audits.score IS 'Monthly health score from 0-100';
COMMENT ON COLUMN public.historical_audits.grade IS 'Letter grade: A (90+), B (75-89), C (60-74), D (40-59), F (<40)';
COMMENT ON COLUMN public.historical_audits.score_breakdown IS 'Component scores: acos_efficiency, conversion_rate, ctr, budget_utilization, waste_ratio';
COMMENT ON COLUMN public.historical_audits.trend_vs_prior_month IS 'Trend vs prior month: up, down, stable, or new';