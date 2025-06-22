
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

      // Filter for real data campaigns only - no simulated data
      const realDataCampaigns = filteredCampaigns.filter(campaign => {
        const isRealSource = campaign.data_source !== 'simulated' && 
                            campaign.data_source !== 'simulation' &&
                            campaign.data_source !== 'fake';
        
        const hasMetrics = (campaign.sales || 0) > 0 || 
                          (campaign.spend || 0) > 0 || 
                          (campaign.orders || 0) > 0 ||
                          (campaign.clicks || 0) > 0 ||
                          (campaign.impressions || 0) > 0;
        
        return isRealSource && hasMetrics;
      });

      if (!realDataCampaigns.length) {
        console.log('No real data campaigns available for weekly analysis');
        setWeeklyMetrics(null);
        setLoading(false);
        return;
      }

      const campaignIds = realDataCampaigns.map(c => c.id);
      
      // Try to fetch historical data first
      const { currentWeekData, previousWeekData } = await fetchWeeklyHistoricalData(campaignIds);

      // If no historical data, use current campaign metrics (real data only)
      if (currentWeekData.length === 0) {
        console.log('No historical weekly data found, using current real campaign metrics...');
        
        const currentMetrics = calculateMetricsFromCampaigns(realDataCampaigns);
        
        if (!currentMetrics) {
          console.log('No valid metrics from real campaigns');
          setWeeklyMetrics(null);
          setLoading(false);
          return;
        }

        const previousMetrics = previousWeekData.length > 0 
          ? calculateMetricsFromData(previousWeekData)
          : null;

        const changes = calculateWeekOverWeekChanges(currentMetrics, previousMetrics);

        const weeklyMetricsResult: WeeklyMetrics = {
          ...currentMetrics,
          ...changes,
          hasRealData: true,
          dataSourceInfo: `Real data from current campaign metrics (${realDataCampaigns.length} campaigns)`
        };

        console.log('Weekly metrics from real campaigns:', weeklyMetricsResult);
        setWeeklyMetrics(weeklyMetricsResult);
        setLoading(false);
        return;
      }

      // Use historical data if available (already filtered for real data campaigns)
      const currentMetrics = calculateMetricsFromData(currentWeekData);
      
      if (!currentMetrics) {
        console.log('No valid metrics from historical data');
        setWeeklyMetrics(null);
        setLoading(false);
        return;
      }

      const previousMetrics = previousWeekData.length > 0 
        ? calculateMetricsFromData(previousWeekData)
        : null;

      const changes = calculateWeekOverWeekChanges(currentMetrics, previousMetrics);

      const weeklyMetricsResult: WeeklyMetrics = {
        ...currentMetrics,
        ...changes,
        hasRealData: true,
        dataSourceInfo: `Real historical data from last 7 days (${currentWeekData.length} data points)`
      };

      console.log('Weekly metrics calculated from real historical data:', weeklyMetricsResult);
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
