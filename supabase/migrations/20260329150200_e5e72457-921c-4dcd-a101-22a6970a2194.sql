-- Remove user write policies from subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Remove user write policies from billing_subscriptions
DROP POLICY IF EXISTS "Users can insert their own billing subscription" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Users can update their own billing subscription" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own billing subscription" ON public.billing_subscriptions;