import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface MetricThreshold {
  warn: number;
  critical: number;
}

export interface AnomalyDetectionSettings {
  id: string;
  user_id: string;
  profile_id: string;
  enabled: boolean;
  intraday_enabled: boolean;
  daily_enabled: boolean;
  warn_threshold: number;
  critical_threshold: number;
  metric_thresholds: Record<string, MetricThreshold>;
  intraday_cooldown_hours: number;
  daily_cooldown_hours: number;
  notify_on_warn: boolean;
  notify_on_critical: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<AnomalyDetectionSettings, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> = {
  enabled: true,
  intraday_enabled: true,
  daily_enabled: true,
  warn_threshold: 3.0,
  critical_threshold: 5.0,
  metric_thresholds: {},
  intraday_cooldown_hours: 6,
  daily_cooldown_hours: 48,
  notify_on_warn: false,
  notify_on_critical: true,
};

export const useAnomalySettings = (profileId?: string) => {
  const [settings, setSettings] = useState<AnomalyDetectionSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSettings = useCallback(async () => {
    if (!profileId || !user?.id) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('anomaly_detection_settings')
        .select('*')
        .eq('profile_id', profileId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        setSettings({
          ...data,
          metric_thresholds: (data.metric_thresholds as unknown as Record<string, MetricThreshold>) || {},
        } as AnomalyDetectionSettings);
      } else {
        // Return defaults if no settings exist
        setSettings(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anomaly settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [profileId, user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (
    updates: Partial<Omit<AnomalyDetectionSettings, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!profileId || !user?.id) return;

    setLoading(true);
    try {
      // Build the payload with proper typing for Supabase
      const payload: {
        user_id: string;
        profile_id: string;
        updated_at: string;
        enabled?: boolean;
        intraday_enabled?: boolean;
        daily_enabled?: boolean;
        warn_threshold?: number;
        critical_threshold?: number;
        metric_thresholds?: Json;
        intraday_cooldown_hours?: number;
        daily_cooldown_hours?: number;
        notify_on_warn?: boolean;
        notify_on_critical?: boolean;
      } = {
        user_id: user.id,
        profile_id: profileId,
        updated_at: new Date().toISOString(),
      };
      
      // Only add defined values
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.intraday_enabled !== undefined) payload.intraday_enabled = updates.intraday_enabled;
      if (updates.daily_enabled !== undefined) payload.daily_enabled = updates.daily_enabled;
      if (updates.warn_threshold !== undefined) payload.warn_threshold = updates.warn_threshold;
      if (updates.critical_threshold !== undefined) payload.critical_threshold = updates.critical_threshold;
      if (updates.metric_thresholds !== undefined) payload.metric_thresholds = updates.metric_thresholds as unknown as Json;
      if (updates.intraday_cooldown_hours !== undefined) payload.intraday_cooldown_hours = updates.intraday_cooldown_hours;
      if (updates.daily_cooldown_hours !== undefined) payload.daily_cooldown_hours = updates.daily_cooldown_hours;
      if (updates.notify_on_warn !== undefined) payload.notify_on_warn = updates.notify_on_warn;
      if (updates.notify_on_critical !== undefined) payload.notify_on_critical = updates.notify_on_critical;

      // Use insert/update pattern for better type safety
      const { data: existing } = await supabase
        .from('anomaly_detection_settings')
        .select('id')
        .eq('profile_id', profileId)
        .eq('user_id', user.id)
        .maybeSingle();

      let data;
      let upsertError;

      if (existing) {
        // Update existing record
        const result = await supabase
          .from('anomaly_detection_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        data = result.data;
        upsertError = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('anomaly_detection_settings')
          .insert(payload)
          .select()
          .single();
        data = result.data;
        upsertError = result.error;
      }

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      if (data) {
        setSettings({
          ...data,
          metric_thresholds: (data.metric_thresholds as unknown as Record<string, MetricThreshold>) || {},
        } as AnomalyDetectionSettings);
      }
      
      toast({
        title: "Settings saved",
        description: "Anomaly detection settings updated successfully.",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profileId, user?.id, toast]);

  const resetDefaults = useCallback(async () => {
    await updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  const getEffectiveSettings = useCallback((): Omit<AnomalyDetectionSettings, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> => {
    if (settings) {
      return {
        enabled: settings.enabled,
        intraday_enabled: settings.intraday_enabled,
        daily_enabled: settings.daily_enabled,
        warn_threshold: settings.warn_threshold,
        critical_threshold: settings.critical_threshold,
        metric_thresholds: settings.metric_thresholds || {},
        intraday_cooldown_hours: settings.intraday_cooldown_hours,
        daily_cooldown_hours: settings.daily_cooldown_hours,
        notify_on_warn: settings.notify_on_warn,
        notify_on_critical: settings.notify_on_critical,
      };
    }
    return DEFAULT_SETTINGS;
  }, [settings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetDefaults,
    getEffectiveSettings,
    refetch: fetchSettings,
  };
};
