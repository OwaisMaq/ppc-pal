
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';
import { PerformanceMetrics, FilterParams } from '@/types/performance';
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
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (campaignsLoading || keywordsLoading) return;

    console.log('=== Performance Data Processing ===');
    console.log('Campaigns available:', campaigns.length);
    console.log('Keywords available:', keywords.length);
    console.log('Connections:', connections.length);

    // Calculate metrics from campaign data
    const calculatedMetrics = calculateMetrics(campaigns);
    setMetrics(calculatedMetrics);

    // Determine if we have real data
    const realDataCampaigns = campaigns.filter(c => 
      c.data_source === 'amazon_api' && 
      (c.sales > 0 || c.spend > 0 || c.orders > 0)
    ).length;
    
    const hasData = campaigns.length > 0;
    const hasReal = realDataCampaigns > 0;
    
    setHasRealData(hasReal);
    
    // Set data quality information
    setDataQuality({
      hasRealData: hasReal,
      realDataCampaigns,
      totalCampaigns: campaigns.length,
      simulatedCampaigns: campaigns.length - realDataCampaigns,
      dataSourceBreakdown: {
        'amazon_api': realDataCampaigns,
        'simulated': campaigns.length - realDataCampaigns
      },
      apiDataQuality: hasReal ? 'good' : campaigns.length > 0 ? 'poor' : 'none'
    });

    // Generate recommendations
    const newRecommendations = [];
    if (!hasData) {
      newRecommendations.push('Connect your Amazon account and sync campaigns to see performance data');
    } else if (!hasReal) {
      newRecommendations.push('Sync your campaigns to get real performance metrics');
      newRecommendations.push('Current data may be simulated for demonstration purposes');
    } else {
      newRecommendations.push('Performance data is up to date');
      if (calculatedMetrics?.averageAcos && calculatedMetrics.averageAcos > 30) {
        newRecommendations.push('Consider optimizing campaigns with high ACOS');
      }
    }
    
    setRecommendations(newRecommendations);
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const loading = campaignsLoading || keywordsLoading;
  const hasData = campaigns.length > 0;

  return {
    metrics,
    loading,
    hasData,
    hasRealData,
    dataQuality,
    recommendations
  };
};
