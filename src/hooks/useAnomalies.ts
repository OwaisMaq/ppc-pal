import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Anomaly {
  id: string;
  profile_id: string;
  scope: string;
  entity_id?: string;
  metric: string;
  time_window: string;
  ts: string;
  value: number;
  baseline: number;
  score: number;
  direction: 'spike' | 'dip';
  severity: 'info' | 'warn' | 'critical';
  state: 'new' | 'acknowledged' | 'muted' | 'resolved';
  created_at: string;
}

export interface AnomalyFilters {
  profileId?: string;
  metric?: string;
  severity?: string;
  timeWindow?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useAnomalies = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnomalies = useCallback(async (filters: AnomalyFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('anomalies')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.profileId) {
        query = query.eq('profile_id', filters.profileId);
      }
      if (filters.metric) {
        query = query.eq('metric', filters.metric);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.timeWindow) {
        query = query.eq('time_window', filters.timeWindow);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setAnomalies((data || []) as Anomaly[]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch anomalies';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateAnomalyState = useCallback(async (
    anomalyId: string,
    newState: 'acknowledged' | 'muted' | 'resolved'
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('anomalies')
        .update({ state: newState })
        .eq('id', anomalyId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setAnomalies(prev => prev.map(anomaly => 
        anomaly.id === anomalyId 
          ? { ...anomaly, state: newState }
          : anomaly
      ));

      toast({
        title: "Success",
        description: `Anomaly ${newState}`,
      });
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${newState} anomaly`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const runAnomalyDetection = useCallback(async (options: {
    profileId?: string;
    scope?: 'campaign' | 'ad_group' | 'account';
    window?: 'intraday' | 'daily';
  } = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.profileId) params.append('profileId', options.profileId);
      if (options.scope) params.append('scope', options.scope);
      if (options.window) params.append('window', options.window);

      const { data, error: runError } = await supabase.functions.invoke('anomalies-runner', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (runError) {
        throw new Error(runError.message);
      }

      toast({
        title: "Success",
        description: `Anomaly detection completed. Found ${data.anomaliesFound} anomalies.`,
      });

      // Refresh anomalies
      await fetchAnomalies();

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run anomaly detection';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast, fetchAnomalies]);

  const getAnomalyMetrics = useCallback((anomalies: Anomaly[]) => {
    const total = anomalies.length;
    const critical = anomalies.filter(a => a.severity === 'critical').length;
    const warnings = anomalies.filter(a => a.severity === 'warn').length;
    const new_ = anomalies.filter(a => a.state === 'new').length;
    const acknowledged = anomalies.filter(a => a.state === 'acknowledged').length;

    return {
      total,
      critical,
      warnings,
      new: new_,
      acknowledged,
    };
  }, []);

  return {
    anomalies,
    loading,
    error,
    fetchAnomalies,
    updateAnomalyState,
    runAnomalyDetection,
    getAnomalyMetrics,
  };
};