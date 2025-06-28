
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';
import { PerformanceMetrics, FilterParams } from '@/types/performance';
import { filterCampaigns } from '@/utils/campaignFilter';
import { processPerformanceData } from '@/utils/performanceDataProcessor';
import { filterRealDataOnly } from '@/utils/dataFilter';

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

    console.log('=== STRICT PERFORMANCE DATA HOOK - NO SIMULATION DATA ===');
    console.log('Input parameters:');
    console.log('- connectionId:', connectionId);
    console.log('- selectedCountry:', selectedCountry);
    console.log('- selectedCampaign:', selectedCampaign);
    console.log('- selectedProduct:', selectedProduct);
    console.log('Data available:');
    console.log('- Total campaigns:', campaigns.length);
    console.log('- Keywords:', keywords.length);
    console.log('- Connections:', connections.length);

    // STRICT: Only work with real API data
    const realApiCampaigns = filterRealDataOnly(campaigns);
    console.log('- Real API campaigns:', realApiCampaigns.length);

    if (realApiCampaigns.length === 0) {
      console.log('❌ NO REAL API CAMPAIGNS - Setting empty state');
      setMetrics(null);
      setHasRealData(false);
      setDataQuality({
        hasRealData: false,
        realDataCampaigns: 0,
        totalCampaigns: campaigns.length,
        simulatedCampaigns: campaigns.length
      });
      setRecommendations(['No real Amazon API data available. Please sync your Amazon connection.']);
      return;
    }

    calculateAndSetMetrics(realApiCampaigns);
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign, selectedProduct]);

  const calculateAndSetMetrics = (realApiCampaigns: any[]) => {
    console.log('🔄 Calculating metrics from', realApiCampaigns.length, 'real API campaigns');

    // Build proper filter parameters
    const filters: FilterParams = {
      selectedCountry: selectedCountry !== 'all' ? selectedCountry : undefined,
      selectedCampaign: selectedCampaign !== 'all' ? selectedCampaign : undefined,
      selectedProduct: selectedProduct !== 'all' ? selectedProduct : undefined
    };
    
    console.log('Applying filters:', filters);
    
    // Filter campaigns based on selections (only real API campaigns)
    const filteredCampaigns = filterCampaigns(realApiCampaigns, connections, filters);
    console.log(`✓ Filtered campaigns: ${filteredCampaigns.length} (from ${realApiCampaigns.length} real API campaigns)`);
    
    // Process performance data with filtered real API campaigns
    const { metrics: calculatedMetrics, dataQuality: quality, recommendations: recs } = processPerformanceData(filteredCampaigns);
    
    // Set state based on results
    setMetrics(calculatedMetrics);
    setHasRealData(calculatedMetrics !== null && quality.hasRealData);
    setDataQuality(quality);
    setRecommendations(recs);

    console.log('=== STRICT PERFORMANCE DATA RESULTS ===');
    console.log('Metrics calculated:', calculatedMetrics !== null);
    console.log('Has real data:', calculatedMetrics !== null && quality.hasRealData);
    console.log('Real data campaigns:', quality.realDataCampaigns);
    console.log('Total filtered campaigns:', quality.totalCampaigns);
    
    if (calculatedMetrics) {
      console.log('✅ REAL API METRICS CALCULATED:', {
        totalSales: calculatedMetrics.totalSales,
        totalSpend: calculatedMetrics.totalSpend,
        totalProfit: calculatedMetrics.totalProfit,
        totalOrders: calculatedMetrics.totalOrders,
        activeCampaigns: calculatedMetrics.activeCampaigns
      });
    } else {
      console.log('❌ NO METRICS CALCULATED - No real API data available');
    }
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: filterRealDataOnly(campaigns).length > 0, // Only count real data
    hasRealData,
    dataQuality,
    recommendations
  };
};
