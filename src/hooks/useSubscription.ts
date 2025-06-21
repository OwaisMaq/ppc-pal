
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      setSubscription(subData);

      // Fetch usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      setUsage(usageData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const isFreeTier = !subscription || subscription.plan_type === 'free';
  const isProTier = subscription && subscription.plan_type === 'pro';
  const usageLimit = isFreeTier ? 0 : 100; // Pro tier gets 100 optimizations per month

  const checkCanOptimize = async () => {
    try {
      const { data, error } = await supabase.rpc('can_user_optimize', {
        user_uuid: user?.id
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking optimization permission:', error);
      return false;
    }
  };

  const incrementUsage = async () => {
    try {
      const { error } = await supabase.rpc('increment_optimization_usage', {
        user_uuid: user?.id
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const createCheckoutSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      return data.checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return null;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  return { 
    subscription, 
    usage,
    usageLimit,
    loading, 
    error,
    isFreeTier,
    isProTier,
    checkCanOptimize,
    incrementUsage,
    createCheckoutSession,
    openCustomerPortal,
    refreshSubscription
  };
};
