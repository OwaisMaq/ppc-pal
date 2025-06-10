
-- Update free plan to allow 1 optimization
UPDATE public.usage_limits 
SET optimization_limit = 1 
WHERE plan_type = 'free';
