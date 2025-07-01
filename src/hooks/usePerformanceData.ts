
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';
import { PerformanceMetrics, FilterParams } from '@/types/performance';

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

    // Since Amazon functionality has been removed, return empty state
    setMetrics(null);
    setHasRealData(false);
    setDataQuality({
      hasRealData: false,
      realDataCampaigns: 0,
      totalCampaigns: 0
    });
    setRecommendations(['Amazon functionality has been removed. No performance data available.']);
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: false,
    hasRealData,
    dataQuality,
    recommendations
  };
};
