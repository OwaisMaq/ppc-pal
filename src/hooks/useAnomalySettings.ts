import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
          metric_thresholds: (data.metric_thresholds || {}) as Record<string, MetricThreshold>,
        } as AnomalyDetectionSettings);
      } else {
        // Return defaults if no settings exist
        setSettings(null);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch anomaly settings';
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
      // Build the upsert payload
      const payload: Record<string, unknown> = {
        user_id: user.id,
        profile_id: profileId,
        updated_at: new Date().toISOString(),
      };
      
      // Add each update field
      Object.entries(updates).forEach(([key, value]) => {
        payload[key] = value;
      });

      const { data, error: upsertError } = await supabase
        .from('anomaly_detection_settings')
        .upsert(payload, { 
          onConflict: 'user_id,profile_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setSettings({
        ...data,
        metric_thresholds: (data.metric_thresholds || {}) as Record<string, MetricThreshold>,
      } as AnomalyDetectionSettings);
      toast({
        title: "Settings saved",
        description: "Anomaly detection settings updated successfully.",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update settings';
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
