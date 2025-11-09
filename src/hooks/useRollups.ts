import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RollupKPIs {
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
  baseCurrency: string;
}

export interface RollupBreakdown {
  key: string;
  label: string;
  spendBase: number;
  salesBase: number;
  clicks: number;
  impressions: number;
  conversions: number;
  acos: number;
  roas: number;
  cpc: number;
  ctr: number;
  cvr: number;
}

export function useRollups() {
  const [kpis, setKpis] = useState<RollupKPIs | null>(null);
  const [breakdown, setBreakdown] = useState<RollupBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchKpis = async (filters: {
    profileIds: string[];
    from: string;
    to: string;
    base?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profileIds: filters.profileIds.join(','),
        from: filters.from,
        to: filters.to,
        base: filters.base || 'GBP',
      });

      const { data, error } = await supabase.functions.invoke(`rollups/kpis?${params.toString()}`);

      if (error) throw error;

      setKpis(data.kpis || null);
    } catch (err: any) {
      console.error('Error fetching rollup KPIs:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch multi-account KPIs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakdown = async (filters: {
    profileIds: string[];
    from: string;
    to: string;
    base?: string;
    dimension?: 'marketplace' | 'profile' | 'campaignType';
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        profileIds: filters.profileIds.join(','),
        from: filters.from,
        to: filters.to,
        base: filters.base || 'GBP',
        dimension: filters.dimension || 'profile',
        limit: (filters.limit || 10).toString(),
      });

      const { data, error } = await supabase.functions.invoke(`rollups/breakdown?${params.toString()}`);

      if (error) throw error;

      setBreakdown(data.breakdown || []);
    } catch (err: any) {
      console.error('Error fetching rollup breakdown:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch breakdown data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportKpisCSV = async (filters: {
    profileIds: string[];
    from: string;
    to: string;
    base?: string;
  }) => {
    try {
      await fetchKpis(filters);
      
      if (!kpis) {
        throw new Error('No KPIs data available');
      }

      const headers = [
        'Metric',
        'Value',
        'Currency',
      ];

      const rows = [
        ['Total Spend', kpis.totalSpend.toFixed(2), kpis.baseCurrency],
        ['Total Sales', kpis.totalSales.toFixed(2), kpis.baseCurrency],
        ['Total Clicks', kpis.totalClicks.toString(), ''],
        ['Total Impressions', kpis.totalImpressions.toString(), ''],
        ['Total Conversions', kpis.totalConversions.toString(), ''],
        ['Average ACOS', `${kpis.avgACOS.toFixed(2)}%`, ''],
        ['Average ROAS', kpis.avgROAS.toFixed(2), ''],
        ['Average CPC', kpis.avgCPC.toFixed(2), kpis.baseCurrency],
        ['Average CTR', `${kpis.avgCTR.toFixed(2)}%`, ''],
        ['Average CVR', `${kpis.avgCVR.toFixed(2)}%`, ''],
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rollup_kpis_${filters.from}_${filters.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Rollup KPIs exported to CSV',
      });
    } catch (err: any) {
      console.error('Error exporting KPIs CSV:', err);
      toast({
        title: 'Error',
        description: 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  return {
    kpis,
    breakdown,
    loading,
    error,
    fetchKpis,
    fetchBreakdown,
    exportKpisCSV,
  };
}