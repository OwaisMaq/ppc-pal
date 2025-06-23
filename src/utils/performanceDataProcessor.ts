
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

export interface DataQualityInfo {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
}

export interface ProcessedPerformanceData {
  metrics: PerformanceMetrics | null;
  dataQuality: DataQualityInfo;
  recommendations: string[];
}

// Strict filter for ONLY real API data - no simulated data allowed
const filterRealApiDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from real Amazon API
    const isRealApiData = campaign.data_source === 'api';
    
    // Must have actual performance metrics (not just zeros)
    const hasRealMetrics = (campaign.sales || 0) > 0 || 
                          (campaign.spend || 0) > 0 || 
                          (campaign.orders || 0) > 0 ||
                          (campaign.clicks || 0) > 0 ||
                          (campaign.impressions || 0) > 0;
    
    const isValid = isRealApiData && hasRealMetrics;
    
    if (isRealApiData && !hasRealMetrics) {
      console.log(`Campaign ${campaign.name} has real API source but no performance metrics`);
    }
    
    return isValid;
  });
};

const generateDataQuality = (campaigns: CampaignData[], realDataCampaigns: CampaignData[]): DataQualityInfo => {
  const dataSourceBreakdown: Record<string, number> = {};
  
  campaigns.forEach(campaign => {
    const source = campaign.data_source || 'unknown';
    dataSourceBreakdown[source] = (dataSourceBreakdown[source] || 0) + 1;
  });

  return {
    hasRealData: realDataCampaigns.length > 0,
    realDataCampaigns: realDataCampaigns.length,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: campaigns.length - realDataCampaigns.length,
    dataSourceBreakdown
  };
};

const generateRecommendations = (dataQuality: DataQualityInfo): string[] => {
  const recommendations: string[] = [];
  
  if (!dataQuality.hasRealData) {
    recommendations.push("No real Amazon API data available. Please sync your Amazon account to get real performance metrics.");
    recommendations.push("Check that your Amazon Advertising account has active campaigns with recent activity.");
    recommendations.push("Verify your Amazon connection is properly authenticated and has the necessary permissions.");
  } else if (dataQuality.simulatedCampaigns > 0) {
    recommendations.push(`${dataQuality.simulatedCampaigns} campaigns are using simulated data. Sync your account to get real metrics.`);
  }
  
  if (dataQuality.realDataCampaigns > 0 && dataQuality.realDataCampaigns < 5) {
    recommendations.push("Consider running more campaigns to get better performance insights.");
  }
  
  return recommendations;
};

const calculateRealApiMetrics = (realDataCampaigns: CampaignData[]): PerformanceMetrics | null => {
  if (realDataCampaigns.length === 0) {
    console.log('❌ NO REAL API DATA AVAILABLE - Cannot calculate metrics');
    return null;
  }

  console.log(`✅ Calculating metrics from ${realDataCampaigns.length} real API campaigns`);

  // Calculate totals from real data only
  const totalSales = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.sales || 0), 0);
  const totalSpend = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const totalOrders = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.orders || 0), 0);
  const totalImpressions = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
  const totalClicks = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);

  // Calculate derived metrics
  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCostPerUnit = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  // Calculate month-over-month changes from real data only
  const previousSales = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_sales || 0), 0);
  const previousSpend = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_spend || 0), 0);
  const previousOrders = realDataCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_orders || 0), 0);
  const previousProfit = previousSales - previousSpend;

  const salesChange = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
  const spendChange = previousSpend > 0 ? ((totalSpend - previousSpend) / previousSpend) * 100 : 0;
  const ordersChange = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
  const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;

  console.log('📊 REAL API METRICS CALCULATED:');
  console.log(`- Sales: $${totalSales.toFixed(2)} (${salesChange.toFixed(1)}% change)`);
  console.log(`- Spend: $${totalSpend.toFixed(2)} (${spendChange.toFixed(1)}% change)`);
  console.log(`- Orders: ${totalOrders} (${ordersChange.toFixed(1)}% change)`);
  console.log(`- ROAS: ${averageRoas.toFixed(2)}x`);

  return {
    totalSales,
    totalSpend,
    totalProfit,
    totalOrders,
    averageAcos,
    averageRoas,
    averageCostPerUnit,
    totalImpressions,
    totalClicks,
    averageCtr,
    averageCpc,
    conversionRate,
    salesChange,
    spendChange,
    ordersChange,
    profitChange,
    hasSimulatedData: false, // We only use real data
    dataSourceInfo: `Real Amazon API data from ${realDataCampaigns.length} campaigns`
  };
};

export const processPerformanceData = (campaigns: CampaignData[]): ProcessedPerformanceData => {
  console.log('=== PROCESSING PERFORMANCE DATA (REAL API ONLY) ===');
  console.log(`Total campaigns received: ${campaigns.length}`);
  
  if (!campaigns || campaigns.length === 0) {
    console.log('❌ No campaigns provided');
    return {
      metrics: null,
      dataQuality: {
        hasRealData: false,
        realDataCampaigns: 0,
        totalCampaigns: 0,
        simulatedCampaigns: 0,
        dataSourceBreakdown: {}
      },
      recommendations: ['No campaign data available. Please connect your Amazon account and sync data.']
    };
  }

  // Filter to only real API data with actual metrics
  const realDataCampaigns = filterRealApiDataOnly(campaigns);
  
  console.log(`Real API campaigns with metrics: ${realDataCampaigns.length}`);
  console.log(`Simulated/invalid campaigns: ${campaigns.length - realDataCampaigns.length}`);

  // Generate data quality information
  const dataQuality = generateDataQuality(campaigns, realDataCampaigns);
  
  // Generate recommendations
  const recommendations = generateRecommendations(dataQuality);
  
  // Calculate metrics only from real data
  const metrics = calculateRealApiMetrics(realDataCampaigns);

  console.log('=== PROCESSING COMPLETE ===');
  console.log(`Metrics calculated: ${metrics !== null}`);
  console.log(`Has real data: ${dataQuality.hasRealData}`);

  return {
    metrics,
    dataQuality,
    recommendations
  };
};
