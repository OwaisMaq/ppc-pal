import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConversionPath {
  date: string;
  source: string;
  profile_id: string;
  path_fingerprint: string;
  path_json: any[];
  conversions: number;
  sales_micros: number;
  clicks: number;
  views: number;
  touch_count: number;
}

export interface AttributionRun {
  id: string;
  profile_id: string;
  model: string;
  params?: any;
  date_from: string;
  date_to: string;
  created_at: string;
  status: string;
  error?: string;
}

export interface AttributionResult {
  run_id: string;
  profile_id: string;
  level: string;
  campaign_id?: string;
  ad_group_id?: string;
  target_id?: string;
  conversions_weighted: number;
  sales_weighted_micros: number;
}

export interface TimeLagBucket {
  bucket: string;
  conversions: number;
  sales_micros: number;
}

export const useAttribution = () => {
  const [conversionPaths, setConversionPaths] = useState<ConversionPath[]>([]);
  const [attributionRuns, setAttributionRuns] = useState<AttributionRun[]>([]);
  const [attributionResults, setAttributionResults] = useState<AttributionResult[]>([]);
  const [timeLagData, setTimeLagData] = useState<TimeLagBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getAvailableModels = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('attribution', {
        body: { operation: 'models' }
      });

      if (error) throw error;
      return data.models || [];
    } catch (err: any) {
      console.error('Failed to get attribution models:', err);
      return [];
    }
  }, []);

  const fetchConversionPaths = useCallback(async (filters: {
    profileId: string;
    dateFrom: string;
    dateTo: string;
    source?: string;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('attribution', {
        body: {
          operation: 'paths',
          profileId: filters.profileId,
          from: filters.dateFrom,
          to: filters.dateTo,
          source: filters.source || 'v3',
          limit: filters.limit || 25
        }
      });

      if (error) throw error;
      setConversionPaths(data.paths || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch conversion paths';
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

  const fetchTimeLagData = useCallback(async (filters: {
    profileId: string;
    dateFrom: string;
    dateTo: string;
    source?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('attribution', {
        body: {
          operation: 'time-lag',
          profileId: filters.profileId,
          from: filters.dateFrom,
          to: filters.dateTo,
          source: filters.source || 'v3'
        }
      });

      if (error) throw error;
      setTimeLagData(data.buckets || []);
    } catch (err: any) {
      console.error('Failed to fetch time lag data:', err);
    }
  }, []);

  const runAttributionModel = useCallback(async (request: {
    profileId: string;
    model: string;
    params?: any;
    dateFrom: string;
    dateTo: string;
    level?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('attribution', {
        body: {
          operation: 'run',
          ...request
        }
      });

      if (error) throw error;

      toast({
        title: "Attribution Model",
        description: `${request.model} model completed successfully`,
      });

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run attribution model';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAttributionResults = useCallback(async (filters: {
    profileId: string;
    dateFrom: string;
    dateTo: string;
    model: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('attribution', {
        body: {
          operation: 'summary',
          profileId: filters.profileId,
          from: filters.dateFrom,
          to: filters.dateTo,
          model: filters.model
        }
      });

      if (error) throw error;
      setAttributionResults(data.results || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch attribution results';
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

  const fetchAttributionRuns = useCallback(async (profileId?: string) => {
    try {
      let query = supabase
        .from('attribution_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttributionRuns(data || []);
    } catch (err: any) {
      console.error('Failed to fetch attribution runs:', err);
    }
  }, []);

  const runConversionPathIngestion = useCallback(async (profileId?: string) => {
    try {
      const params = new URLSearchParams();
      if (profileId) params.append('profileId', profileId);

      const { data, error } = await supabase.functions.invoke('conversion-path-runner?' + params.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;

      toast({
        title: "Conversion Paths",
        description: data.message,
      });

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run conversion path ingestion';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  return {
    conversionPaths,
    attributionRuns,
    attributionResults,
    timeLagData,
    loading,
    error,
    getAvailableModels,
    fetchConversionPaths,
    fetchTimeLagData,
    runAttributionModel,
    fetchAttributionResults,
    fetchAttributionRuns,
    runConversionPathIngestion,
  };
};