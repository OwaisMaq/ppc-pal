
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

    calculateAndSetMetrics();
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateAndSetMetrics = () => {
    console.log('=== Enhanced Performance Metrics Calculation ===');
    console.log('Available campaigns:', campaigns.length);
    console.log('Available connections:', connections.length);
    
    if (!campaigns.length && !keywords.length) {
      console.log('No campaigns or keywords available');
      setMetrics(null);
      setHasRealData(false);
      setDataQuality(null);
      setRecommendations([]);
      return;
    }

    // Filter campaigns based on selections
    const filters: FilterParams = {
      selectedCountry,
      selectedCampaign,
      selectedProduct
    };
    
    const filteredCampaigns = filterCampaigns(campaigns, connections, filters);
    
    // Use enhanced performance data processor
    const { metrics: calculatedMetrics, dataQuality: quality, recommendations: recs } = processPerformanceData(filteredCampaigns);
    
    setMetrics(calculatedMetrics);
    setHasRealData(calculatedMetrics !== null);
    setDataQuality(quality);
    setRecommendations(recs);

    console.log('=== Enhanced Metrics Calculation Complete ===');
    console.log('Metrics available:', calculatedMetrics !== null);
    console.log('Has real data:', calculatedMetrics !== null);
    console.log('Data quality:', quality);
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
