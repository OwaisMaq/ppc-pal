-- Fix critical security issues

-- 1. Fix function search_path issues for existing functions
ALTER FUNCTION public.fx_rate(date, text, text) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.calculate_robust_z_score(numeric, numeric, numeric) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.get_anomaly_severity(numeric) SET search_path = 'public', 'extensions';
ALTER FUNCTION public.generate_anomaly_fingerprint(text, text, text, text, text, text) SET search_path = 'public', 'extensions';

-- 2. Create security definer function to check profiles access safely
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'extensions'
AS $$
  SELECT auth.uid() = profile_user_id OR public.has_role(auth.uid(), 'admin');
$$;

-- 3. Add missing RLS policies for profiles table INSERT operations
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Add missing RLS policies for billing_subscriptions INSERT operations  
CREATE POLICY "Users can insert their own billing subscription" ON public.billing_subscriptions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Ensure profiles table has proper UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (public.can_access_profile(id))
WITH CHECK (public.can_access_profile(id));

-- 6. Add comprehensive DELETE policy for profiles
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;  
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE 
USING (public.can_access_profile(id));

-- 7. Fix billing subscriptions UPDATE policy to use secure function
DROP POLICY IF EXISTS "Users can update their own billing subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can update their own billing subscription" ON public.billing_subscriptions
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Add DELETE policy for billing subscriptions
CREATE POLICY "Users can delete their own billing subscription" ON public.billing_subscriptions
FOR DELETE 
USING (auth.uid() = user_id);