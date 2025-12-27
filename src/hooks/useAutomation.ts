import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AutomationRule {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  rule_type: string;
  mode: 'dry_run' | 'suggestion' | 'auto';
  enabled: boolean;
  severity: 'info' | 'warn' | 'critical';
  params: any;
  action: any;
  throttle?: {
    cooldownHours?: number;
    maxActionsPerDay?: number;
  };
  created_at: string;
  updated_at: string;
  automation_rule_runs?: RuleRun[];
}

export interface RuleRun {
  id: string;
  started_at: string;
  finished_at?: string;
  status: string;
  alerts_created: number;
  actions_enqueued: number;
  error?: string;
}

export interface Alert {
  id: string;
  rule_id: string;
  profile_id: string;
  entity_type?: string;
  entity_id?: string;
  level: string;
  title: string;
  message: string;
  data?: any;
  state: 'new' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  automation_rules?: {
    name: string;
    rule_type: string;
  };
}

export function useAutomationRules(profileId?: string) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRules = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) {
        throw new Error('No authentication token');
      }

      const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/rules`);
      if (profileId) url.searchParams.set('profileId', profileId);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch rules');
      }

      const result = await response.json();
      setRules(result.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule_id: ruleId, enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule');
      }

      await fetchRules(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const changeMode = async (ruleId: string, mode: 'dry_run' | 'suggestion' | 'auto') => {
    if (!user) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule_id: ruleId, mode }),
      });

      if (!response.ok) {
        throw new Error('Failed to change rule mode');
      }

      await fetchRules(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const runRule = async (ruleId: string, mode?: string) => {
    if (!user) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/run`);
      url.searchParams.set('ruleId', ruleId);
      if (mode) url.searchParams.set('mode', mode);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to run rule');
      }

      const result = await response.json();
      await fetchRules(); // Refresh
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const initializeRules = async (profileId: string) => {
    if (!user) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_id: profileId }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize rules');
      }

      await fetchRules(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (user) {
      fetchRules();
    }
  }, [user, profileId]);

  return {
    rules,
    loading,
    error,
    toggleRule,
    changeMode,
    runRule,
    initializeRules,
    refetch: fetchRules
  };
}

export function useAlerts(profileId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAlerts = async (state?: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) {
        throw new Error('No authentication token');
      }

      const url = new URL(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/alerts`);
      if (profileId) url.searchParams.set('profileId', profileId);
      if (state) url.searchParams.set('state', state);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const result = await response.json();
      setAlerts(result.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlerts = async (alertIds: string[]) => {
    if (!user) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(`https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/rules-api/alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alert_ids: alertIds, action: 'acknowledge' }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alerts');
      }

      await fetchAlerts(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user, profileId]);

  return {
    alerts,
    loading,
    error,
    acknowledgeAlerts,
    refetch: fetchAlerts
  };
}