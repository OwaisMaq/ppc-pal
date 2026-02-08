import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PlanName } from '@/hooks/useEntitlements';

interface SubscriptionData {
  id: string;
  plan_type: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  current_period_end?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

interface UsageData {
  optimizations_used: number;
  period_start: string;
  period_end: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLimit, setUsageLimit] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [canOptimize, setCanOptimize] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      await checkStripeSubscription();

      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) throw subError;

      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', new Date().toISOString().slice(0, 7) + '-01')
        .maybeSingle();

      if (usageError) throw usageError;

      const planType = subscriptionData?.plan_type || 'free';
      const { data: limitData, error: limitError } = await supabase
        .from('usage_limits')
        .select('optimization_limit')
        .eq('plan_type', planType)
        .single();

      if (limitError) throw limitError;

      setSubscription(subscriptionData);
      setUsage(usageData);
      setUsageLimit(limitData.optimization_limit);

      const currentUsage = usageData?.optimizations_used || 0;
      setCanOptimize(currentUsage < limitData.optimization_limit);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeSubscription = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      console.log('Stripe subscription check result:', data);
    } catch (error) {
      console.error('Error checking Stripe subscription:', error);
    }
  };

  const createCheckoutSession = async (plan?: PlanName) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: { plan: plan || 'starter' },
      });
      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
      return null;
    }
  };

  const openCustomerPortal = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open customer portal');
    }
  };

  const checkCanOptimize = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc('can_user_optimize', {
        user_uuid: user.id,
      });
      if (error) throw error;
      setCanOptimize(data);
      return data;
    } catch (error) {
      console.error('Error checking optimization permission:', error);
      return false;
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.rpc('increment_optimization_usage', {
        user_uuid: user.id,
      });
      if (error) throw error;
      await fetchSubscriptionData();
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  // Derive plan from billing_subscriptions or fall back to subscriptions table
  const planType = subscription?.plan_type || 'free';

  return {
    subscription,
    usage,
    usageLimit,
    loading,
    canOptimize,
    checkCanOptimize,
    incrementUsage,
    refreshSubscription: fetchSubscriptionData,
    createCheckoutSession,
    openCustomerPortal,
    isFreeTier: planType === 'free',
    isProTier: planType === 'pro',
    isStarterTier: planType === 'starter',
    isAgencyTier: planType === 'agency',
    planType,
  };
};
