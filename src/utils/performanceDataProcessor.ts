
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

export interface DataQualityInfo {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
  debugInfo?: {
    campaignsWithMetrics: number;
    campaignsFromAPI: number;
    emptyCampaigns: number;
  };
}

export interface ProcessedPerformanceData {
  metrics: PerformanceMetrics | null;
  dataQuality: DataQualityInfo;
  recommendations: string[];
}

// More lenient filter - accept campaigns with API source OR any performance metrics
const filterValidCampaigns = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Check if campaign has any performance metrics at all
    const hasAnyMetrics = (campaign.sales || 0) > 0 || 
                         (campaign.spend || 0) > 0 || 
                         (campaign.orders || 0) > 0 ||
                         (campaign.clicks || 0) > 0 ||
                         (campaign.impressions || 0) > 0;
    
    // Check if it's from API source
    const isFromAPI = campaign.data_source === 'api';
    
    console.log(`Campaign ${campaign.name}:`, {
      data_source: campaign.data_source,
      isFromAPI,
      hasAnyMetrics,
      sales: campaign.sales,
      spend: campaign.spend,
      orders: campaign.orders,
      clicks: campaign.clicks,
      impressions: campaign.impressions
    });
    
    // For now, let's be more lenient and include campaigns that are from API source
    // even if they don't have metrics yet (they might be new campaigns)
    return isFromAPI || hasAnyMetrics;
  });
};

// Strict filter for ONLY real API data with actual metrics
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
      console.log(`Campaign ${campaign.name} has real API source but no performance metrics yet`);
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

  // Debug information
  const campaignsWithMetrics = campaigns.filter(c => 
    (c.sales || 0) > 0 || 
    (c.spend || 0) > 0 || 
    (c.orders || 0) > 0 ||
    (c.clicks || 0) > 0 ||
    (c.impressions || 0) > 0
  ).length;
  
  const campaignsFromAPI = campaigns.filter(c => c.data_source === 'api').length;
  const emptyCampaigns = campaigns.length - campaignsWithMetrics;

  return {
    hasRealData: realDataCampaigns.length > 0,
    realDataCampaigns: realDataCampaigns.length,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: campaigns.length - realDataCampaigns.length,
    dataSourceBreakdown,
    debugInfo: {
      campaignsWithMetrics,
      campaignsFromAPI,
      emptyCampaigns
    }
  };
};

const generateRecommendations = (dataQuality: DataQualityInfo): string[] => {
  const recommendations: string[] = [];
  
  if (!dataQuality.hasRealData) {
    if (dataQuality.totalCampaigns === 0) {
      recommendations.push("No campaigns found. Please ensure you have active campaigns in your Amazon Advertising account.");
      recommendations.push("If you just created campaigns, please wait 24-48 hours for data to appear, then sync again.");
    } else if (dataQuality.debugInfo?.campaignsFromAPI === 0) {
      recommendations.push("Campaigns found but none are marked as real API data. Please re-sync your Amazon connection.");
    } else if (dataQuality.debugInfo?.campaignsWithMetrics === 0) {
      recommendations.push("Amazon campaigns found but no performance metrics available yet. New campaigns typically take 24-48 hours to show performance data.");
      recommendations.push("Make sure your campaigns are active and have received impressions/clicks.");
    }
    recommendations.push("Check that your Amazon Advertising account has proper permissions and active campaigns.");
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
  console.log('=== PROCESSING PERFORMANCE DATA (ENHANCED DEBUG) ===');
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
        dataSourceBreakdown: {},
        debugInfo: {
          campaignsWithMetrics: 0,
          campaignsFromAPI: 0,
          emptyCampaigns: 0
        }
      },
      recommendations: ['No campaign data available. Please connect your Amazon account and sync data.']
    };
  }

  // Filter to only campaigns with valid data
  const validCampaigns = filterValidCampaigns(campaigns);
  const realDataCampaigns = filterRealApiDataOnly(campaigns);
  
  console.log(`Valid campaigns (any metrics): ${validCampaigns.length}`);
  console.log(`Real API campaigns with metrics: ${realDataCampaigns.length}`);
  console.log(`Total campaigns in database: ${campaigns.length}`);

  // Generate data quality information
  const dataQuality = generateDataQuality(campaigns, realDataCampaigns);
  
  console.log('Data quality analysis:', dataQuality);
  
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
