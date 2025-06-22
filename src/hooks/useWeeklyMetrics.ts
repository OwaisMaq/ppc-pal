
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAmazonConnections } from './useAmazonConnections';
import { useCampaignData } from './useCampaignData';
import { FilterParams } from '@/types/performance';
import { filterCampaigns } from '@/utils/campaignFilter';
import { WeeklyMetrics } from '@/types/weeklyMetrics';
import { 
  calculateMetricsFromData, 
  calculateMetricsFromCampaigns, 
  calculateWeekOverWeekChanges 
} from '@/utils/weeklyMetricsCalculator';
import { fetchWeeklyHistoricalData } from '@/services/weeklyDataService';

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

      const campaignIds = campaignsWithMetrics.map(c => c.id);
      
      // Try to fetch historical data first
      const { currentWeekData, previousWeekData } = await fetchWeeklyHistoricalData(campaignIds);

      // If no historical data, use current campaign metrics
      if (currentWeekData.length === 0) {
        console.log('No historical weekly data found, using current campaign metrics...');
        
        const currentMetrics = calculateMetricsFromCampaigns(campaignsWithMetrics);
        const previousMetrics = previousWeekData.length > 0 
          ? calculateMetricsFromData(previousWeekData)
          : null;

        const changes = calculateWeekOverWeekChanges(currentMetrics, previousMetrics);

        const weeklyMetricsResult: WeeklyMetrics = {
          ...currentMetrics,
          ...changes,
          hasRealData,
          dataSourceInfo: `Based on current campaign metrics (${campaignsWithMetrics.length} campaigns)`
        };

        console.log('Weekly metrics from campaigns:', weeklyMetricsResult);
        setWeeklyMetrics(weeklyMetricsResult);
        setLoading(false);
        return;
      }

      // Use historical data if available
      const currentMetrics = calculateMetricsFromData(currentWeekData);
      const previousMetrics = previousWeekData.length > 0 
        ? calculateMetricsFromData(previousWeekData)
        : null;

      const changes = calculateWeekOverWeekChanges(currentMetrics, previousMetrics);

      const weeklyMetricsResult: WeeklyMetrics = {
        ...currentMetrics,
        ...changes,
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

  return {
    weeklyMetrics,
    loading,
    hasRealData: weeklyMetrics?.hasRealData || false
  };
};
