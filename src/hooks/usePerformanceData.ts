
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

    console.log('=== PERFORMANCE DATA HOOK CALCULATION (ENHANCED) ===');
    console.log('Input parameters:');
    console.log('- connectionId:', connectionId);
    console.log('- selectedCountry:', selectedCountry);
    console.log('- selectedCampaign:', selectedCampaign);
    console.log('- selectedProduct:', selectedProduct);
    console.log('Data available:');
    console.log('- Campaigns:', campaigns.length);
    console.log('- Keywords:', keywords.length);
    console.log('- Connections:', connections.length);

    // Log campaign data quality
    if (campaigns.length > 0) {
      const withMetrics = campaigns.filter(c => 
        (c.sales || 0) > 0 || (c.spend || 0) > 0 || (c.orders || 0) > 0
      );
      const apiCampaigns = campaigns.filter(c => c.data_source === 'api');
      console.log('Campaign data quality:');
      console.log(`- Total campaigns: ${campaigns.length}`);
      console.log(`- API campaigns: ${apiCampaigns.length}`);
      console.log(`- Campaigns with metrics: ${withMetrics.length}`);
      
      if (withMetrics.length > 0) {
        console.log('Sample campaign with metrics:', {
          name: withMetrics[0].name,
          sales: withMetrics[0].sales,
          spend: withMetrics[0].spend,
          orders: withMetrics[0].orders,
          data_source: withMetrics[0].data_source
        });
      }
    }

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

    // Build proper filter parameters - DO NOT pass country as connectionId
    const filters: FilterParams = {
      selectedCountry: selectedCountry !== 'all' ? selectedCountry : undefined,
      selectedCampaign: selectedCampaign !== 'all' ? selectedCampaign : undefined,
      selectedProduct: selectedProduct !== 'all' ? selectedProduct : undefined
    };
    
    console.log('Applying filters:', filters);
    
    // Filter campaigns based on selections
    const filteredCampaigns = filterCampaigns(campaigns, connections, filters);
    console.log(`✓ Filtered campaigns: ${filteredCampaigns.length} (from ${campaigns.length} total)`);
    
    // Log sample filtered campaigns for debugging
    if (filteredCampaigns.length > 0) {
      console.log('Sample filtered campaigns:');
      filteredCampaigns.slice(0, 3).forEach((campaign, index) => {
        console.log(`  ${index + 1}. ${campaign.name} (${campaign.data_source})`, {
          sales: campaign.sales,
          spend: campaign.spend,
          orders: campaign.orders,
          status: campaign.status
        });
      });
    }
    
    // Process performance data with filtered campaigns
    const { metrics: calculatedMetrics, dataQuality: quality, recommendations: recs } = processPerformanceData(filteredCampaigns);
    
    // Set state based on results
    setMetrics(calculatedMetrics);
    setHasRealData(calculatedMetrics !== null && quality.hasRealData);
    setDataQuality(quality);
    setRecommendations(recs);

    console.log('=== PERFORMANCE DATA HOOK RESULTS (ENHANCED) ===');
    console.log('Metrics calculated:', calculatedMetrics !== null);
    console.log('Has real data:', calculatedMetrics !== null && quality.hasRealData);
    console.log('Real data campaigns:', quality.realDataCampaigns);
    console.log('Total filtered campaigns:', quality.totalCampaigns);
    
    if (calculatedMetrics) {
      console.log('✓ METRICS SUCCESSFULLY CALCULATED:', {
        totalSales: calculatedMetrics.totalSales,
        totalSpend: calculatedMetrics.totalSpend,
        totalProfit: calculatedMetrics.totalProfit,
        totalOrders: calculatedMetrics.totalOrders,
        activeCampaigns: calculatedMetrics.activeCampaigns,
        averageAcos: calculatedMetrics.averageAcos,
        averageRoas: calculatedMetrics.averageRoas
      });
    } else {
      console.log('❌ NO METRICS CALCULATED - Check campaign data and filters');
    }
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
