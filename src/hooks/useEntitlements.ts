import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type PlanName = 'free' | 'starter' | 'pro' | 'agency';

export interface PlanEntitlements {
  plan: PlanName;
  features: Record<string, boolean | string>;
  limits: Record<string, number>;
}

interface EntitlementResult {
  allowed: boolean;
  plan: PlanName;
  feature_value?: boolean;
  limit_value?: number;
  current_usage?: number;
  message?: string;
}

const PLAN_LABELS: Record<PlanName, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
};

const UPGRADE_PATH: Record<PlanName, PlanName | null> = {
  free: 'starter',
  starter: 'pro',
  pro: 'agency',
  agency: null,
};

export const useEntitlements = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanName>('free');
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPlan();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPlan = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Get billing subscription plan
      const { data: billing } = await supabase
        .from('billing_subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPlan: PlanName =
        billing?.status === 'active' || billing?.status === 'trialing'
          ? (billing.plan as PlanName) || 'free'
          : 'free';

      // Get entitlements for the plan
      const { data: ent } = await supabase
        .from('plan_entitlements')
        .select('plan, features, limits')
        .eq('plan', currentPlan)
        .single();

      setPlan(currentPlan);
      if (ent) {
        setEntitlements(ent as unknown as PlanEntitlements);
      }
    } catch (err) {
      console.error('Error fetching entitlements:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = useCallback(
    (feature: string): boolean => {
      if (!entitlements) return false;
      const val = entitlements.features[feature];
      return val === true || (typeof val === 'string' && val !== 'false');
    },
    [entitlements]
  );

  const checkLimit = useCallback(
    (limit: string, currentValue: number): boolean => {
      if (!entitlements) return false;
      const max = entitlements.limits[limit];
      if (max === undefined) return false;
      if (max === -1) return true; // unlimited
      return currentValue < max;
    },
    [entitlements]
  );

  const getLimitValue = useCallback(
    (limit: string): number | null => {
      if (!entitlements) return null;
      return entitlements.limits[limit] ?? null;
    },
    [entitlements]
  );

  const getUpgradeTarget = useCallback((): PlanName | null => {
    return UPGRADE_PATH[plan];
  }, [plan]);

  const planLabel = PLAN_LABELS[plan];

  return {
    plan,
    planLabel,
    entitlements,
    loading,
    checkFeature,
    checkLimit,
    getLimitValue,
    getUpgradeTarget,
    refreshEntitlements: fetchPlan,
  };
};
