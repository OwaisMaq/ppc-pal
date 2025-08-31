import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TargetFilters {
  profileId: string;
  from: string;
  to: string;
  type?: 'keyword' | 'product';
  matchType?: string;
  hasSales?: boolean;
  minClicks?: number;
  maxACOS?: number;
  asin?: string;
  category?: string;
  brand?: string;
  campaignId?: string;
  adGroupId?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

export interface Target {
  targetId: string;
  targetType: 'keyword' | 'product';
  expression: any;
  campaignId: string;
  adGroupId: string;
  clicks: number;
  impressions: number;
  spend: number;
  sales: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cvr: number;
  acos: number;
  roas: number;
}

export interface PurchasedProduct {
  purchasedAsin: string;
  advertisedAsin: string;
  campaignId: string;
  adGroupId: string;
  units: number;
  sales: number;
}

export interface TargetSummary {
  totalSpend: number;
  totalSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  avgACOS: number;
  avgROAS: number;
  avgCPC: number;
  avgCTR: number;
  avgCVR: number;
}

export function useTargetStudio() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
  const [summary, setSummary] = useState<TargetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTargets = async (filters: TargetFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const { data, error } = await supabase.functions.invoke('target-studio/targets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });

      if (error) throw error;

      setTargets(data.targets || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error('Error fetching targets:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch targets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedProducts = async (filters: {
    profileId: string;
    from: string;
    to: string;
    advertisedAsin?: string;
    campaignId?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const { data, error } = await supabase.functions.invoke('target-studio/purchased', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });

      if (error) throw error;

      setPurchasedProducts(data.purchasedProducts || []);
    } catch (err: any) {
      console.error('Error fetching purchased products:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch purchased products',
        variant: 'destructive',
      });
    }
  };

  const bulkPauseTargets = async (profileId: string, targetIds: string[]) => {
    return await bulkTargetAction(profileId, targetIds, 'pause');
  };

  const bulkEnableTargets = async (profileId: string, targetIds: string[]) => {
    return await bulkTargetAction(profileId, targetIds, 'enable');
  };

  const bulkBidUp = async (profileId: string, targetIds: string[], stepMicros: number) => {
    return await bulkTargetAction(profileId, targetIds, 'bid-up', { stepMicros });
  };

  const bulkBidDown = async (profileId: string, targetIds: string[], stepMicros: number) => {
    return await bulkTargetAction(profileId, targetIds, 'bid-down', { stepMicros });
  };

  const bulkTargetAction = async (
    profileId: string,
    targetIds: string[],
    action: 'pause' | 'enable' | 'bid-up' | 'bid-down',
    options?: { stepMicros?: number; minBidMicros?: number; maxBidMicros?: number }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke(`target-studio/${action}`, {
        method: 'POST',
        body: {
          profileId,
          targetIds,
          action,
          ...options,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${data.actionsEnqueued} actions enqueued`,
      });

      return data;
    } catch (err: any) {
      console.error(`Error in bulk ${action}:`, err);
      toast({
        title: 'Error',
        description: `Failed to ${action} targets`,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const bulkAddNegatives = async (
    profileId: string,
    scope: 'campaign' | 'ad_group',
    targetIds: string[],
    value: string,
    matchType?: string
  ) => {
    try {
      const payload = {
        profileId,
        scope,
        value,
        matchType,
        ...(scope === 'campaign' ? { campaignIds: targetIds } : { adGroupIds: targetIds }),
      };

      const { data, error } = await supabase.functions.invoke('target-studio/negatives', {
        method: 'POST',
        body: payload,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${data.actionsEnqueued} negative actions enqueued`,
      });

      return data;
    } catch (err: any) {
      console.error('Error adding negatives:', err);
      toast({
        title: 'Error',
        description: 'Failed to add negatives',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const bulkCreateTargets = async (
    profileId: string,
    adGroupId: string,
    targets: Array<{ expression: any; bidMicros: number }>
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('target-studio/create-targets', {
        method: 'POST',
        body: {
          profileId,
          adGroupId,
          targets,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${data.actionsEnqueued} create actions enqueued`,
      });

      return data;
    } catch (err: any) {
      console.error('Error creating targets:', err);
      toast({
        title: 'Error',
        description: 'Failed to create targets',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const exportTargetsCSV = async (filters: TargetFilters) => {
    try {
      // Fetch all targets without limit
      const fullFilters = { ...filters, limit: 10000 };
      await fetchTargets(fullFilters);

      // Convert to CSV
      const headers = [
        'Target ID',
        'Type',
        'Expression',
        'Campaign ID',
        'Ad Group ID',
        'Clicks',
        'Impressions',
        'Spend',
        'Sales',
        'Conversions',
        'CTR %',
        'CPC',
        'CVR %',
        'ACOS %',
        'ROAS',
      ];

      const csvContent = [
        headers.join(','),
        ...targets.map(target =>
          [
            target.targetId,
            target.targetType,
            JSON.stringify(target.expression).replace(/"/g, '""'),
            target.campaignId,
            target.adGroupId,
            target.clicks,
            target.impressions,
            target.spend.toFixed(2),
            target.sales.toFixed(2),
            target.conversions,
            target.ctr.toFixed(2),
            target.cpc.toFixed(2),
            target.cvr.toFixed(2),
            target.acos.toFixed(2),
            target.roas.toFixed(2),
          ].join(',')
        ),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `targets_${filters.profileId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Targets exported to CSV',
      });
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      toast({
        title: 'Error',
        description: 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  return {
    targets,
    purchasedProducts,
    summary,
    loading,
    error,
    fetchTargets,
    fetchPurchasedProducts,
    bulkPauseTargets,
    bulkEnableTargets,
    bulkBidUp,
    bulkBidDown,
    bulkAddNegatives,
    bulkCreateTargets,
    exportTargetsCSV,
  };
}