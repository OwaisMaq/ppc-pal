
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { fetchWeeklyHistoricalData } from '@/services/weeklyDataService';
import { calculateMetricsFromData, calculateMetricsFromCampaigns, calculateWeekOverWeekChanges } from '@/utils/weeklyMetricsCalculator';
import { WeeklyMetrics } from '@/types/weeklyMetrics';

export const useWeeklyMetrics = (
  connectionId?: string,
  selectedCountry?: string, 
  selectedCampaign?: string, 
  selectedProduct?: string
) => {
  const { campaigns, loading: campaignsLoading } = useCampaignData(connectionId);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    calculateWeeklyMetrics();
  }, [campaigns, campaignsLoading, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateWeeklyMetrics = async () => {
    if (campaignsLoading) return;

    try {
      setLoading(true);
      console.log('=== CALCULATING WEEKLY METRICS ===');
      console.log('Available campaigns:', campaigns.length);

      if (campaigns.length === 0) {
        console.log('No campaigns available for weekly metrics');
        setWeeklyMetrics(null);
        setHasRealData(false);
        setLoading(false);
        return;
      }

      // Filter campaigns with real data
      const realDataCampaigns = campaigns.filter(campaign => {
        const isRealData = campaign.data_source === 'api';
        const hasMetrics = (campaign.sales || 0) > 0 || 
                          (campaign.spend || 0) > 0 || 
                          (campaign.orders || 0) > 0 ||
                          (campaign.clicks || 0) > 0 ||
                          (campaign.impressions || 0) > 0;
        return isRealData && hasMetrics;
      });

      console.log(`Found ${realDataCampaigns.length} campaigns with real data and metrics`);

      if (realDataCampaigns.length === 0) {
        console.log('No real data campaigns available for weekly metrics');
        setWeeklyMetrics(null);
        setHasRealData(false);
        setLoading(false);
        return;
      }

      // Try to get historical data first
      const campaignIds = realDataCampaigns.map(c => c.id);
      let metrics: WeeklyMetrics | null = null;

      try {
        const { currentWeekData, previousWeekData } = await fetchWeeklyHistoricalData(campaignIds);
        
        if (currentWeekData.length > 0) {
          console.log(`Using historical data: ${currentWeekData.length} records`);
          metrics = calculateMetricsFromData(currentWeekData);
          
          // Calculate week-over-week changes if we have previous week data
          if (metrics && previousWeekData.length > 0) {
            const previousMetrics = calculateMetricsFromData(previousWeekData);
            if (previousMetrics) {
              const changes = calculateWeekOverWeekChanges(metrics, previousMetrics);
              metrics = { ...metrics, ...changes };
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch historical data, falling back to campaign data:', error);
      }

      // Fallback to current campaign data if no historical data
      if (!metrics) {
        console.log('Using current campaign data for weekly metrics');
        metrics = calculateMetricsFromCampaigns(realDataCampaigns);
      }

      if (metrics) {
        console.log('✅ Weekly metrics calculated successfully:', {
          sales: metrics.totalSales,
          spend: metrics.totalSpend,
          orders: metrics.totalOrders,
          hasRealData: metrics.hasRealData
        });
        setWeeklyMetrics(metrics);
        setHasRealData(true);
      } else {
        console.log('❌ Unable to calculate weekly metrics');
        setWeeklyMetrics(null);
        setHasRealData(false);
      }

    } catch (error) {
      console.error('Error calculating weekly metrics:', error);
      setWeeklyMetrics(null);
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    weeklyMetrics,
    loading,
    hasRealData
  };
};
