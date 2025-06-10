
-- Set free plan to allow 1 optimization for testing
UPDATE public.usage_limits 
SET optimization_limit = 1 
WHERE plan_type = 'free';
