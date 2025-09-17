-- Fix critical security issues (handling existing policies)

-- 1. Fix function search_path issues for remaining functions
ALTER FUNCTION public.generate_path_fingerprint(jsonb) SET search_path = 'public', 'extensions';

-- 2. Create security definer function to check profiles access safely (if not exists)
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'extensions'
AS $$
  SELECT auth.uid() = profile_user_id OR public.has_role(auth.uid(), 'admin');
$$;

-- 3. Fix existing policies to prevent data exposure by adding proper constraints
-- Drop and recreate profiles policies with proper checks
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (public.can_access_profile(id))
WITH CHECK (public.can_access_profile(id));

CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE 
USING (public.can_access_profile(id));

-- 4. Fix billing subscriptions policies
DROP POLICY IF EXISTS "Users can insert their own billing subscription" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Users can update their own billing subscription" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own billing subscription" ON public.billing_subscriptions;

CREATE POLICY "Users can insert their own billing subscription" ON public.billing_subscriptions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing subscription" ON public.billing_subscriptions
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own billing subscription" ON public.billing_subscriptions
FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Add missing SELECT policy for profiles if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
        FOR SELECT 
        USING (public.can_access_profile(id));
    END IF;
END $$;