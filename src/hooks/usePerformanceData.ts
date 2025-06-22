
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';
import { PerformanceMetrics, FilterParams } from '@/types/performance';
import { filterCampaigns } from '@/utils/campaignFilter';
import { calculateMetrics } from '@/utils/metricsCalculator';

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

  useEffect(() => {
    if (campaignsLoading || keywordsLoading) return;

    calculateAndSetMetrics();
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateAndSetMetrics = () => {
    console.log('=== Calculating Performance Metrics with Real Data Only ===');
    console.log('Available campaigns:', campaigns.length);
    console.log('Available connections:', connections.length);
    
    if (!campaigns.length && !keywords.length) {
      console.log('No campaigns or keywords available');
      setMetrics(null);
      setHasRealData(false);
      return;
    }

    // Filter campaigns based on selections
    const filters: FilterParams = {
      selectedCountry,
      selectedCampaign,
      selectedProduct
    };
    
    const filteredCampaigns = filterCampaigns(campaigns, connections, filters);
    
    // Calculate metrics from filtered campaigns (will return null if no real data)
    const calculatedMetrics = calculateMetrics(filteredCampaigns);
    setMetrics(calculatedMetrics);
    setHasRealData(calculatedMetrics !== null);
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: campaigns.length > 0 || keywords.length > 0,
    hasRealData
  };
};
