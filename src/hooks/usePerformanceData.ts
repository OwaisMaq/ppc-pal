
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';
import { PerformanceMetrics, FilterParams } from '@/types/performance';
import { filterCampaigns } from '@/utils/campaignFilter';
import { processPerformanceData } from '@/utils/performanceDataProcessor';

export const usePerformanceData = (
  connectionId?: string, 
  selectedCountry?: string, 
  selectedCampaign?: string, 
  selectedProduct?: string
) => {
  const { connections } = useAmazonConnections();
  const { campaigns, loading: campaignsLoading } = useCampaignData(connectionId);
  const { keywords, loading: keywordsLoading } = useKeywordData(connectionId);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (campaignsLoading || keywordsLoading) return;

    console.log('=== PERFORMANCE DATA HOOK CALCULATION ===');
    console.log('Campaigns available:', campaigns.length);
    console.log('Keywords available:', keywords.length);
    console.log('Connections available:', connections.length);

    calculateAndSetMetrics();
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateAndSetMetrics = () => {
    // If no campaigns are available, set appropriate state
    if (!campaigns.length) {
      console.log('❌ No campaigns available - cannot calculate metrics');
      setMetrics(null);
      setHasRealData(false);
      setDataQuality({
        hasRealData: false,
        realDataCampaigns: 0,
        totalCampaigns: 0,
        simulatedCampaigns: 0,
        dataSourceBreakdown: {}
      });
      setRecommendations(['No campaign data available. Please connect your Amazon account and sync data.']);
      return;
    }

    // Filter campaigns based on selections
    const filters: FilterParams = {
      selectedCountry,
      selectedCampaign,
      selectedProduct
    };
    
    const filteredCampaigns = filterCampaigns(campaigns, connections, filters);
    console.log(`Filtered campaigns: ${filteredCampaigns.length}`);
    
    // Process performance data with strict real-data-only requirements
    const { metrics: calculatedMetrics, dataQuality: quality, recommendations: recs } = processPerformanceData(filteredCampaigns);
    
    // Set state based on results
    setMetrics(calculatedMetrics);
    setHasRealData(calculatedMetrics !== null && quality.hasRealData);
    setDataQuality(quality);
    setRecommendations(recs);

    console.log('=== PERFORMANCE DATA HOOK RESULTS ===');
    console.log('Metrics available:', calculatedMetrics !== null);
    console.log('Has real data:', calculatedMetrics !== null && quality.hasRealData);
    console.log('Real data campaigns:', quality.realDataCampaigns);
    console.log('Total campaigns:', quality.totalCampaigns);
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: campaigns.length > 0 || keywords.length > 0,
    hasRealData,
    dataQuality,
    recommendations
  };
};
