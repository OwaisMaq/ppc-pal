
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

// More realistic filter - campaigns from API source are considered valid even without immediate metrics
const filterValidCampaigns = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Accept campaigns that are from API source - they're real Amazon campaigns
    const isFromAPI = campaign.data_source === 'api';
    
    // Also accept campaigns with any performance metrics
    const hasAnyMetrics = (campaign.sales || 0) > 0 || 
                         (campaign.spend || 0) > 0 || 
                         (campaign.orders || 0) > 0 ||
                         (campaign.clicks || 0) > 0 ||
                         (campaign.impressions || 0) > 0;
    
    console.log(`Campaign ${campaign.name}:`, {
      data_source: campaign.data_source,
      isFromAPI,
      hasAnyMetrics,
      status: campaign.status,
      amazon_campaign_id: campaign.amazon_campaign_id
    });
    
    // Include all campaigns from API source - they represent real Amazon campaigns
    return isFromAPI || hasAnyMetrics;
  });
};

const generateDataQuality = (campaigns: CampaignData[], validCampaigns: CampaignData[]): DataQualityInfo => {
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

  // Real data means we have campaigns from Amazon API
  const hasRealData = campaignsFromAPI > 0;
  const realDataCampaigns = campaignsFromAPI; // All API campaigns count as real data

  return {
    hasRealData,
    realDataCampaigns,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: campaigns.length - campaignsFromAPI,
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
    } else {
      recommendations.push("Campaigns found but none are from Amazon API. Please re-sync your Amazon connection.");
    }
    recommendations.push("Check that your Amazon Advertising account has proper permissions and active campaigns.");
  } else {
    // We have real API campaigns
    if (dataQuality.debugInfo?.campaignsWithMetrics === 0) {
      recommendations.push("Amazon campaigns found but no performance metrics available yet. This is normal for new campaigns.");
      recommendations.push("Performance data typically appears 24-48 hours after campaign activity begins.");
      recommendations.push("Make sure your campaigns are active and receiving impressions/clicks.");
    } else if (dataQuality.debugInfo?.campaignsWithMetrics && dataQuality.debugInfo.campaignsWithMetrics < dataQuality.realDataCampaigns) {
      recommendations.push(`${dataQuality.realDataCampaigns - dataQuality.debugInfo.campaignsWithMetrics} campaigns don't have performance metrics yet. This is normal for new or inactive campaigns.`);
    }
    
    if (dataQuality.realDataCampaigns > 0 && dataQuality.realDataCampaigns < 5) {
      recommendations.push("Consider running more campaigns to get better performance insights.");
    }
  }
  
  return recommendations;
};

const calculateMetricsFromApiCampaigns = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  // Filter to only campaigns from API with any data at all
  const apiCampaigns = campaigns.filter(c => c.data_source === 'api');
  
  if (apiCampaigns.length === 0) {
    console.log('❌ NO API CAMPAIGNS AVAILABLE - Cannot calculate metrics');
    return null;
  }

  console.log(`✅ Calculating metrics from ${apiCampaigns.length} Amazon API campaigns`);

  // Calculate totals from API campaigns (even if metrics are zero)
  const totalSales = apiCampaigns.reduce((sum, campaign) => sum + (campaign.sales || 0), 0);
  const totalSpend = apiCampaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const totalOrders = apiCampaigns.reduce((sum, campaign) => sum + (campaign.orders || 0), 0);
  const totalImpressions = apiCampaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
  const totalClicks = apiCampaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);

  // Calculate derived metrics
  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCostPerUnit = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  // Calculate month-over-month changes from API campaigns
  const previousSales = apiCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_sales || 0), 0);
  const previousSpend = apiCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_spend || 0), 0);
  const previousOrders = apiCampaigns.reduce((sum, campaign) => sum + (campaign.previous_month_orders || 0), 0);
  const previousProfit = previousSales - previousSpend;

  const salesChange = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
  const spendChange = previousSpend > 0 ? ((totalSpend - previousSpend) / previousSpend) * 100 : 0;
  const ordersChange = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
  const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;

  // Determine if we have any actual performance data
  const hasPerformanceData = totalSales > 0 || totalSpend > 0 || totalOrders > 0 || totalClicks > 0 || totalImpressions > 0;

  console.log('📊 API CAMPAIGN METRICS CALCULATED:');
  console.log(`- API Campaigns: ${apiCampaigns.length}`);
  console.log(`- Has Performance Data: ${hasPerformanceData}`);
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
    hasSimulatedData: false, // We only use API data
    dataSourceInfo: hasPerformanceData 
      ? `Real Amazon API data from ${apiCampaigns.length} campaigns with performance metrics`
      : `Real Amazon API campaigns (${apiCampaigns.length}) found but no performance data yet. This is normal for new campaigns.`
  };
};

export const processPerformanceData = (campaigns: CampaignData[]): ProcessedPerformanceData => {
  console.log('=== PROCESSING PERFORMANCE DATA (REALISTIC APPROACH) ===');
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

  // Filter to campaigns that are valid (from API or have metrics)
  const validCampaigns = filterValidCampaigns(campaigns);
  
  console.log(`Valid campaigns: ${validCampaigns.length}`);
  console.log(`Total campaigns in database: ${campaigns.length}`);

  // Generate data quality information based on all campaigns
  const dataQuality = generateDataQuality(campaigns, validCampaigns);
  
  console.log('Data quality analysis:', dataQuality);
  
  // Generate recommendations based on data quality
  const recommendations = generateRecommendations(dataQuality);
  
  // Calculate metrics from API campaigns
  const metrics = calculateMetricsFromApiCampaigns(campaigns);

  console.log('=== PROCESSING COMPLETE ===');
  console.log(`Metrics calculated: ${metrics !== null}`);
  console.log(`Has real data: ${dataQuality.hasRealData}`);
  console.log(`API campaigns: ${dataQuality.debugInfo?.campaignsFromAPI}`);

  return {
    metrics,
    dataQuality,
    recommendations
  };
};
