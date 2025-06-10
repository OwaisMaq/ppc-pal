
-- Revert free plan back to 0 optimizations
UPDATE public.usage_limits 
SET optimization_limit = 0 
WHERE plan_type = 'free';
