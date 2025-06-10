
-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'incomplete');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  optimizations_used INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '1 day'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Create usage limits table
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type public.subscription_plan NOT NULL,
  optimization_limit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_type)
);

-- Insert default usage limits
INSERT INTO public.usage_limits (plan_type, optimization_limit) VALUES
  ('free', 0),
  ('pro', 1000);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage" 
  ON public.usage_tracking 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
  ON public.usage_tracking 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" 
  ON public.usage_tracking 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for usage_limits (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view usage limits" 
  ON public.usage_limits 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create default free subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- Create initial usage tracking for current month
  INSERT INTO public.usage_tracking (user_id, optimizations_used)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Function to check if user can perform optimization
CREATE OR REPLACE FUNCTION public.can_user_optimize(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_plan public.subscription_plan;
  current_usage INTEGER;
  usage_limit INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan_type INTO user_plan
  FROM public.subscriptions
  WHERE user_id = user_uuid AND status = 'active';
  
  -- If no subscription found, default to free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Get usage limit for the plan
  SELECT optimization_limit INTO usage_limit
  FROM public.usage_limits
  WHERE plan_type = user_plan;
  
  -- Get current usage for this month
  SELECT COALESCE(optimizations_used, 0) INTO current_usage
  FROM public.usage_tracking
  WHERE user_id = user_uuid 
    AND period_start = date_trunc('month', now());
  
  -- If no usage record exists, create one
  IF current_usage IS NULL THEN
    INSERT INTO public.usage_tracking (user_id, optimizations_used)
    VALUES (user_uuid, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;
    current_usage := 0;
  END IF;
  
  -- Check if user is under limit
  RETURN current_usage < usage_limit;
END;
$$;

-- Function to increment user optimization usage
CREATE OR REPLACE FUNCTION public.increment_optimization_usage(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert or update usage for current month
  INSERT INTO public.usage_tracking (user_id, optimizations_used)
  VALUES (user_uuid, 1)
  ON CONFLICT (user_id, period_start) 
  DO UPDATE SET 
    optimizations_used = public.usage_tracking.optimizations_used + 1,
    updated_at = now();
END;
$$;

-- Update the existing handle_new_user function to include subscription creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Create default free subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- Create initial usage tracking for current month
  INSERT INTO public.usage_tracking (user_id, optimizations_used)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
