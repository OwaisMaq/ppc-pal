import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreativeAsset {
  asset_id: string;
  asset_type: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CreativePerformance {
  profile_id: string;
  ad_id: string;
  asset_id?: string;
  campaign_id?: string;
  ad_group_id?: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions_7d: number;
  sales_7d_micros: number;
  video_starts?: number;
  video_q25?: number;
  video_q50?: number;
  video_q75?: number;
  video_completes?: number;
  // Derived metrics
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  vtr_25?: number;
  vtr_50?: number;
  vtr_75?: number;
  vtr_100?: number;
}

export interface AdBreakdown {
  ad_id: string;
  campaign_id?: string;
  ad_group_id?: string;
  role: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions_7d: number;
  sales_7d_micros: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  vtr_25?: number;
  vtr_50?: number;
  vtr_75?: number;
  vtr_100?: number;
}

export const useCreativeDiagnostics = () => {
  const [assets, setAssets] = useState<CreativePerformance[]>([]);
  const [adBreakdown, setAdBreakdown] = useState<AdBreakdown[]>([]);
  const [underperformers, setUnderperformers] = useState<CreativePerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAssets = useCallback(async (filters: {
    profileId: string;
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    sort?: string;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profileId: filters.profileId,
        type: filters.type || 'all',
        sort: filters.sort || 'impressions',
        limit: (filters.limit || 50).toString()
      });

      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);

      const { data, error } = await supabase.functions.invoke('creative-diagnostics/assets?' + params.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;
      setAssets(data.assets || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch creative assets';
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

  const fetchAdBreakdown = useCallback(async (filters: {
    profileId: string;
    assetId: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profileId: filters.profileId,
        assetId: filters.assetId
      });

      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);

      const { data, error } = await supabase.functions.invoke('creative-diagnostics/ad-breakdown?' + params.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;
      setAdBreakdown(data.ads || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch ad breakdown';
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

  const fetchUnderperformers = useCallback(async (filters: {
    profileId: string;
    dateFrom?: string;
    dateTo?: string;
    metric?: string;
    threshold?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profileId: filters.profileId,
        metric: filters.metric || 'ctr',
        threshold: (filters.threshold || 10).toString()
      });

      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);

      const { data, error } = await supabase.functions.invoke('creative-diagnostics/underperformers?' + params.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;
      setUnderperformers(data.underperformers || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch underperformers';
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

  const syncAssets = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('creative-diagnostics/sync-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (error) throw error;

      toast({
        title: "Asset Sync",
        description: data.message,
      });

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync assets';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  const getAssetMetrics = useCallback((assets: CreativePerformance[]) => {
    const totalAssets = assets.length;
    const totalImpressions = assets.reduce((sum, asset) => sum + asset.impressions, 0);
    const totalClicks = assets.reduce((sum, asset) => sum + asset.clicks, 0);
    const totalCost = assets.reduce((sum, asset) => sum + asset.cost_micros, 0);
    const totalSales = assets.reduce((sum, asset) => sum + asset.sales_7d_micros, 0);
    
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalCost / totalClicks / 1000000 : 0;
    const avgAcos = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;
    const avgRoas = totalCost > 0 ? totalSales / totalCost : 0;

    return {
      totalAssets,
      totalImpressions,
      totalClicks,
      totalCost: totalCost / 1000000, // Convert to currency
      totalSales: totalSales / 1000000, // Convert to currency
      avgCtr,
      avgCpc,
      avgAcos,
      avgRoas,
    };
  }, []);

  return {
    assets,
    adBreakdown,
    underperformers,
    loading,
    error,
    fetchAssets,
    fetchAdBreakdown,
    fetchUnderperformers,
    syncAssets,
    getAssetMetrics,
  };
};