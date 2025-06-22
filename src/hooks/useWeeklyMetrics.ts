import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAmazonConnections } from './useAmazonConnections';
import { FilterParams } from '@/types/performance';
import { filterCampaigns } from '@/utils/campaignFilter';
import { useCampaignData } from './useCampaignData';

export interface WeeklyMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  averageAcos: number;
  averageRoas: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
  // Week-over-week changes
  salesChange: number;
  spendChange: number;
  ordersChange: number;
  profitChange: number;
  // Data quality
  hasRealData: boolean;
  dataSourceInfo: string;
}

export const useWeeklyMetrics = (
  selectedCountry?: string,
  selectedCampaign?: string,
  selectedProduct?: string
) => {
  const { user } = useAuth();
  const { connections } = useAmazonConnections();
  const { campaigns } = useCampaignData();
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !campaigns.length) {
      setLoading(false);
      return;
    }
    
    calculateWeeklyMetrics();
  }, [user, campaigns, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateWeeklyMetrics = async () => {
    try {
      setLoading(true);
      
      // Apply filters to campaigns
      const filters: FilterParams = {
        selectedCountry,
        selectedCampaign,
        selectedProduct
      };
      
      const filteredCampaigns = filterCampaigns(campaigns, connections, filters);
      
      if (!filteredCampaigns.length) {
        setWeeklyMetrics(null);
        setLoading(false);
        return;
      }

      // Filter for campaigns with meaningful metrics
      const campaignsWithMetrics = filteredCampaigns.filter(campaign => {
        const hasMetrics = (campaign.sales || 0) > 0 || (campaign.spend || 0) > 0 || (campaign.orders || 0) > 0;
        return hasMetrics;
      });

      if (!campaignsWithMetrics.length) {
        console.log('No campaigns with metrics for weekly analysis');
        setWeeklyMetrics(null);
        setLoading(false);
        return;
      }

      // Check if we have real data
      const hasRealData = campaignsWithMetrics.some(campaign => 
        campaign.data_source !== 'simulated' && campaign.data_source !== 'simulation'
      );

      // Get campaign IDs for filtering historical data
      const campaignIds = campaignsWithMetrics.map(c => c.id);
      
      // Calculate date ranges
      const today = new Date();
      const last7DaysStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previous7DaysStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      const previous7DaysEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Try to fetch historical data first
      const { data: currentWeekData } = await supabase
        .from('campaign_metrics_history')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('date', last7DaysStart.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      // If no historical data, use current campaign metrics
      if (!currentWeekData || currentWeekData.length === 0) {
        console.log('No historical weekly data found, using current campaign metrics...');
        
        const currentMetrics = calculateMetricsFromCampaigns(campaignsWithMetrics);
        
        // Try to get previous week historical data for comparison
        const { data: previousWeekData } = await supabase
          .from('campaign_metrics_history')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('date', previous7DaysStart.toISOString().split('T')[0])
          .lt('date', previous7DaysEnd.toISOString().split('T')[0]);
        
        const previousMetrics = previousWeekData && previousWeekData.length > 0 
          ? calculateMetricsFromData(previousWeekData)
          : null;

        // Calculate week-over-week changes
        const salesChange = previousMetrics 
          ? ((currentMetrics.totalSales - previousMetrics.totalSales) / Math.max(previousMetrics.totalSales, 1)) * 100
          : 0;
        
        const spendChange = previousMetrics 
          ? ((currentMetrics.totalSpend - previousMetrics.totalSpend) / Math.max(previousMetrics.totalSpend, 1)) * 100
          : 0;
        
        const ordersChange = previousMetrics 
          ? ((currentMetrics.totalOrders - previousMetrics.totalOrders) / Math.max(previousMetrics.totalOrders, 1)) * 100
          : 0;
        
        const profitChange = previousMetrics 
          ? ((currentMetrics.totalProfit - previousMetrics.totalProfit) / Math.max(Math.abs(previousMetrics.totalProfit), 1)) * 100
          : 0;

        const weeklyMetricsResult: WeeklyMetrics = {
          ...currentMetrics,
          salesChange,
          spendChange,
          ordersChange,
          profitChange,
          hasRealData,
          dataSourceInfo: `Based on current campaign metrics (${campaignsWithMetrics.length} campaigns)`
        };

        console.log('Weekly metrics from campaigns:', weeklyMetricsResult);
        setWeeklyMetrics(weeklyMetricsResult);
        setLoading(false);
        return;
      }

      // Use historical data if available
      const { data: previousWeekData } = await supabase
        .from('campaign_metrics_history')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('date', previous7DaysStart.toISOString().split('T')[0])
        .lt('date', previous7DaysEnd.toISOString().split('T')[0]);

      // Calculate current week metrics
      const currentMetrics = calculateMetricsFromData(currentWeekData);
      
      // Calculate previous week metrics
      const previousMetrics = previousWeekData && previousWeekData.length > 0 
        ? calculateMetricsFromData(previousWeekData)
        : null;

      // Calculate week-over-week changes
      const salesChange = previousMetrics 
        ? ((currentMetrics.totalSales - previousMetrics.totalSales) / Math.max(previousMetrics.totalSales, 1)) * 100
        : 0;
      
      const spendChange = previousMetrics 
        ? ((currentMetrics.totalSpend - previousMetrics.totalSpend) / Math.max(previousMetrics.totalSpend, 1)) * 100
        : 0;
      
      const ordersChange = previousMetrics 
        ? ((currentMetrics.totalOrders - previousMetrics.totalOrders) / Math.max(previousMetrics.totalOrders, 1)) * 100
        : 0;
      
      const profitChange = previousMetrics 
        ? ((currentMetrics.totalProfit - previousMetrics.totalProfit) / Math.max(Math.abs(previousMetrics.totalProfit), 1)) * 100
        : 0;

      const weeklyMetricsResult: WeeklyMetrics = {
        ...currentMetrics,
        salesChange,
        spendChange,
        ordersChange,
        profitChange,
        hasRealData,
        dataSourceInfo: `Based on historical data from last 7 days (${currentWeekData.length} data points)`
      };

      console.log('Weekly metrics calculated from historical data:', weeklyMetricsResult);
      setWeeklyMetrics(weeklyMetricsResult);
    } catch (error) {
      console.error('Error calculating weekly metrics:', error);
      setWeeklyMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetricsFromData = (data: any[]) => {
    const totalSales = data.reduce((sum, d) => sum + (d.sales || 0), 0);
    const totalSpend = data.reduce((sum, d) => sum + (d.spend || 0), 0);
    const totalOrders = data.reduce((sum, d) => sum + (d.orders || 0), 0);
    const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    
    const totalProfit = totalSales - totalSpend;
    const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    return {
      totalSales,
      totalSpend,
      totalProfit,
      totalOrders,
      totalImpressions,
      totalClicks,
      averageAcos,
      averageRoas,
      averageCtr,
      averageCpc,
      conversionRate
    };
  };

  const calculateMetricsFromCampaigns = (campaigns: any[]) => {
    const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalOrders = campaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    
    const totalProfit = totalSales - totalSpend;
    const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    return {
      totalSales,
      totalSpend,
      totalProfit,
      totalOrders,
      totalImpressions,
      totalClicks,
      averageAcos,
      averageRoas,
      averageCtr,
      averageCpc,
      conversionRate
    };
  };

  return {
    weeklyMetrics,
    loading,
    hasRealData: weeklyMetrics?.hasRealData || false
  };
};
