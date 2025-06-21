
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';

export interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  averageAcos: number;
  averageRoas: number;
  averageCostPerUnit: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
}

export const usePerformanceData = (connectionId?: string) => {
  const { campaigns, loading: campaignsLoading } = useCampaignData(connectionId);
  const { keywords, loading: keywordsLoading } = useKeywordData(connectionId);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (campaignsLoading || keywordsLoading) return;

    calculateMetrics();
  }, [campaigns, keywords, campaignsLoading, keywordsLoading]);

  const calculateMetrics = () => {
    if (!campaigns.length && !keywords.length) {
      setMetrics(null);
      return;
    }

    // Use campaign data as primary source, fallback to keyword aggregation
    const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalOrders = campaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

    const totalProfit = totalSales - totalSpend;
    const averageAcos = totalSpend > 0 ? (totalSpend / totalSales) * 100 : 0;
    const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const averageCostPerUnit = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    setMetrics({
      totalSales,
      totalSpend,
      totalProfit,
      totalOrders,
      averageAcos,
      averageRoas,
      averageCostPerUnit,
      totalImpressions,
      totalClicks,
      averageCtr,
      averageCpc,
      conversionRate
    });
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: campaigns.length > 0 || keywords.length > 0
  };
};
