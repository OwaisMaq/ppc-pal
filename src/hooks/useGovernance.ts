import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GovernanceSettings {
  id: string;
  profile_id: string;
  max_bid_change_percent: number;
  min_bid_micros: number;
  max_bid_micros: number;
  daily_spend_cap_micros: number | null;
  monthly_spend_cap_micros: number | null;
  max_actions_per_day: number;
  require_approval_above_micros: number;
  automation_paused: boolean;
  automation_paused_at: string | null;
  automation_paused_reason: string | null;
}

export interface ProtectedEntity {
  id: string;
  profile_id: string;
  entity_type: 'campaign' | 'ad_group' | 'keyword' | 'target';
  entity_id: string;
  entity_name: string | null;
  reason: string | null;
  created_at: string;
}

const DEFAULT_SETTINGS: Omit<GovernanceSettings, 'id' | 'profile_id'> = {
  max_bid_change_percent: 20,
  min_bid_micros: 100000, // $0.10
  max_bid_micros: 10000000, // $10.00
  daily_spend_cap_micros: null,
  monthly_spend_cap_micros: null,
  max_actions_per_day: 100,
  require_approval_above_micros: 1000000, // $1.00
  automation_paused: false,
  automation_paused_at: null,
  automation_paused_reason: null,
};

export function useGovernance(profileId: string | null) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [protectedEntities, setProtectedEntities] = useState<ProtectedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!profileId || !user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('governance_settings')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data as GovernanceSettings);
      } else {
        // Return default settings if none exist (but don't create yet)
        setSettings({
          id: '',
          profile_id: profileId,
          ...DEFAULT_SETTINGS,
        });
      }
    } catch (err) {
      console.error('Error fetching governance settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [profileId, user]);

  const fetchProtectedEntities = useCallback(async () => {
    if (!profileId || !user) {
      setProtectedEntities([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('protected_entities')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProtectedEntities((data || []) as ProtectedEntity[]);
    } catch (err) {
      console.error('Error fetching protected entities:', err);
    }
  }, [profileId, user]);

  useEffect(() => {
    fetchSettings();
    fetchProtectedEntities();
  }, [fetchSettings, fetchProtectedEntities]);

  const updateSettings = async (updates: Partial<GovernanceSettings>) => {
    if (!profileId || !user) return;

    try {
      setSaving(true);
      setError(null);

      const { data: existing } = await supabase
        .from('governance_settings')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('governance_settings')
          .update(updates)
          .eq('profile_id', profileId);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('governance_settings')
          .insert({
            profile_id: profileId,
            user_id: user.id,
            ...DEFAULT_SETTINGS,
            ...updates,
          });

        if (insertError) throw insertError;
      }

      await fetchSettings();
    } catch (err) {
      console.error('Error updating governance settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const toggleAutomation = async (paused: boolean, reason?: string) => {
    await updateSettings({
      automation_paused: paused,
      automation_paused_at: paused ? new Date().toISOString() : null,
      automation_paused_reason: paused ? (reason || 'Manual pause') : null,
    });
  };

  const addProtectedEntity = async (
    entityType: ProtectedEntity['entity_type'],
    entityId: string,
    entityName?: string,
    reason?: string
  ) => {
    if (!profileId || !user) return;

    try {
      setSaving(true);
      const { error: insertError } = await supabase
        .from('protected_entities')
        .insert({
          profile_id: profileId,
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName || null,
          reason: reason || null,
        });

      if (insertError) throw insertError;
      await fetchProtectedEntities();
    } catch (err) {
      console.error('Error adding protected entity:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeProtectedEntity = async (entityId: string) => {
    if (!profileId || !user) return;

    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from('protected_entities')
        .delete()
        .eq('id', entityId);

      if (deleteError) throw deleteError;
      await fetchProtectedEntities();
    } catch (err) {
      console.error('Error removing protected entity:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const isEntityProtected = (entityType: string, entityId: string): boolean => {
    return protectedEntities.some(
      (e) => e.entity_type === entityType && e.entity_id === entityId
    );
  };

  return {
    settings,
    protectedEntities,
    loading,
    saving,
    error,
    updateSettings,
    toggleAutomation,
    addProtectedEntity,
    removeProtectedEntity,
    isEntityProtected,
    refetch: () => {
      fetchSettings();
      fetchProtectedEntities();
    },
  };
}
