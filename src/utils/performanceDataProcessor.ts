
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

interface DataQuality {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  apiDataQuality: 'excellent' | 'good' | 'poor' | 'none';
  averageDataAge: string;
  lastRealDataUpdate?: string;
  dataSourceBreakdown: Record<string, number>;
  attributionWindowUsed?: string;
  apiVersion?: string;
  ppcPalReady?: boolean;
  performanceDataCoverage?: number;
}

export const processPerformanceData = (campaigns: CampaignData[]) => {
  console.log('=== PROCESSING PPC PAL AMAZON API DATA ===');
  console.log(`Input campaigns: ${campaigns.length}`);
  
  // Enhanced filtering for real Amazon API campaigns with performance data
  const realApiCampaigns = campaigns.filter(campaign => {
    const isRealApiData = campaign.data_source === 'api' && 
                         campaign.amazon_campaign_id && 
                         campaign.name;
    
    // Enhanced quality checks for PPC Pal - must have performance metrics
    const hasPerformanceMetrics = (campaign.impressions || 0) > 0 || 
                                 (campaign.clicks || 0) > 0 || 
                                 (campaign.spend || 0) > 0 ||
                                 (campaign.sales || 0) > 0;
    
    return isRealApiData && hasPerformanceMetrics;
  });
  
  console.log(`Real API campaigns with performance metrics: ${realApiCampaigns.length}`);
  
  // Enhanced data source breakdown for PPC Pal analysis
  const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
    const source = campaign.data_source || 'unknown';
    const hasMetrics = (campaign.impressions || 0) > 0 || (campaign.clicks || 0) > 0 || (campaign.spend || 0) > 0;
    const quality = campaign.data_source === 'api' && hasMetrics ? 'high-quality-with-metrics' : 
                   campaign.data_source === 'api' ? 'api-structure-only' : 'simulated';
    const key = `${source} (${quality})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // If no real API campaigns with performance data, return enhanced null metrics
  if (realApiCampaigns.length === 0) {
    console.log('❌ NO AMAZON PERFORMANCE DATA AVAILABLE - PPC Pal integration not ready');
    
    const dataQuality: DataQuality = {
      hasRealData: false,
      realDataCampaigns: 0,
      totalCampaigns: campaigns.length,
      apiDataQuality: 'none',
      averageDataAge: '0 hours',
      dataSourceBreakdown,
      attributionWindowUsed: 'N/A',
      apiVersion: 'N/A',
      ppcPalReady: false,
      performanceDataCoverage: 0
    };
    
    return {
      metrics: null,
      dataQuality,
      recommendations: [
        'No Amazon performance data available for PPC Pal integration',
        'Connect your Amazon Advertising account and ensure reporting API access',
        'Verify advertiser_campaign_view or advertiser_campaign_edit scope permissions',
        'Check that campaigns have recent activity to generate performance metrics',
        'Enable automatic data sync for real-time performance metrics'
      ]
    };
  }
  
  // Enhanced metrics calculation for PPC Pal with comprehensive performance data
  const totals = realApiCampaigns.reduce(
    (acc, campaign) => {
      // Enhanced data validation for PPC Pal requirements
      const sales = Math.max(0, campaign.sales || 0);
      const spend = Math.max(0, campaign.spend || 0);
      const orders = Math.max(0, campaign.orders || 0);
      const impressions = Math.max(0, campaign.impressions || 0);
      const clicks = Math.max(0, campaign.clicks || 0);
      
      return {
        sales: acc.sales + sales,
        spend: acc.spend + spend,
        orders: acc.orders + orders,
        impressions: acc.impressions + impressions,
        clicks: acc.clicks + clicks,
        activeCampaigns: acc.activeCampaigns + (campaign.status === 'enabled' ? 1 : 0),
        validAcos: campaign.acos && campaign.acos > 0 ? [...acc.validAcos, campaign.acos] : acc.validAcos,
        validRoas: campaign.roas && campaign.roas > 0 ? [...acc.validRoas, campaign.roas] : acc.validRoas,
        campaignsWithSales: acc.campaignsWithSales + (sales > 0 ? 1 : 0),
        campaignsWithSpend: acc.campaignsWithSpend + (spend > 0 ? 1 : 0),
        campaignsWithImpressions: acc.campaignsWithImpressions + (impressions > 0 ? 1 : 0),
        campaignsWithClicks: acc.campaignsWithClicks + (clicks > 0 ? 1 : 0),
        campaignsWithOrders: acc.campaignsWithOrders + (orders > 0 ? 1 : 0),
        highPerformingCampaigns: acc.highPerformingCampaigns + (campaign.roas && campaign.roas > 3 ? 1 : 0),
        optimizableCampaigns: acc.optimizableCampaigns + (impressions > 100 && clicks > 10 && spend > 10 ? 1 : 0)
      };
    },
    { 
      sales: 0, 
      spend: 0, 
      orders: 0, 
      impressions: 0, 
      clicks: 0, 
      activeCampaigns: 0,
      validAcos: [] as number[], 
      validRoas: [] as number[],
      campaignsWithSales: 0,
      campaignsWithSpend: 0,
      campaignsWithImpressions: 0,
      campaignsWithClicks: 0,
      campaignsWithOrders: 0,
      highPerformingCampaigns: 0,
      optimizableCampaigns: 0
    }
  );

  // Enhanced metric calculations for PPC Pal
  const averageAcos = totals.validAcos.length > 0 
    ? Math.round((totals.validAcos.reduce((a, b) => a + b, 0) / totals.validAcos.length) * 100) / 100
    : 0;

  const averageRoas = totals.validRoas.length > 0 
    ? Math.round((totals.validRoas.reduce((a, b) => a + b, 0) / totals.validRoas.length) * 100) / 100
    : 0;

  const clickThroughRate = totals.impressions > 0 
    ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 
    : 0;
    
  const conversionRate = totals.clicks > 0 
    ? Math.round((totals.orders / totals.clicks) * 10000) / 100 
    : 0;
    
  const averageCpc = totals.clicks > 0 
    ? Math.round((totals.spend / totals.clicks) * 100) / 100 
    : 0;

  // Enhanced performance metrics with PPC Pal specific insights
  const metrics: PerformanceMetrics = {
    totalSales: Math.round(totals.sales * 100) / 100,
    totalSpend: Math.round(totals.spend * 100) / 100,
    totalProfit: Math.round((totals.sales - totals.spend) * 100) / 100,
    totalOrders: totals.orders,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    activeCampaigns: totals.activeCampaigns,
    totalCampaigns: realApiCampaigns.length,
    averageAcos,
    averageRoas,
    clickThroughRate,
    averageCtr: clickThroughRate,
    averageCpc,
    conversionRate,
    salesChange: 0, // Would need historical data for comparison
    spendChange: 0,
    profitChange: 0,
    ordersChange: 0,
    averageCostPerUnit: totals.orders > 0 ? Math.round((totals.spend / totals.orders) * 100) / 100 : 0,
    hasSimulatedData: false,
    dataSourceInfo: 'amazon-reports-api-v3'
  };

  // Enhanced data quality assessment for PPC Pal
  const dataAge = realApiCampaigns[0]?.last_updated 
    ? Math.round((Date.now() - new Date(realApiCampaigns[0].last_updated).getTime()) / (1000 * 60 * 60))
    : 0;

  // Calculate performance data coverage for PPC Pal readiness
  const totalMetricFields = 5; // impressions, clicks, spend, sales, orders
  const completedMetricCounts = [
    totals.campaignsWithImpressions,
    totals.campaignsWithClicks,
    totals.campaignsWithSpend,
    totals.campaignsWithSales,
    totals.campaignsWithOrders
  ];
  const averageCompleteness = completedMetricCounts.reduce((sum, count) => sum + count, 0) / 
                             (realApiCampaigns.length * totalMetricFields);
  const performanceDataCoverage = Math.round(averageCompleteness * 100);

  const dataQuality: DataQuality = {
    hasRealData: true,
    realDataCampaigns: realApiCampaigns.length,
    totalCampaigns: campaigns.length,
    apiDataQuality: dataAge < 1 ? 'excellent' : dataAge < 24 ? 'good' : 'poor',
    averageDataAge: `${dataAge} hours`,
    lastRealDataUpdate: realApiCampaigns[0]?.last_updated,
    dataSourceBreakdown,
    attributionWindowUsed: '30d',
    apiVersion: 'v3',
    ppcPalReady: performanceDataCoverage >= 70 && totals.optimizableCampaigns > 0,
    performanceDataCoverage
  };

  console.log('✅ PPC PAL AMAZON PERFORMANCE METRICS CALCULATED:', {
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalOrders: metrics.totalOrders,
    realCampaigns: realApiCampaigns.length,
    dataQuality: dataQuality.apiDataQuality,
    ppcPalReady: dataQuality.ppcPalReady,
    performanceDataCoverage: dataQuality.performanceDataCoverage,
    optimizableCampaigns: totals.optimizableCampaigns
  });

  // Enhanced recommendations based on PPC Pal requirements
  const recommendations = [];
  
  if (performanceDataCoverage < 70) {
    recommendations.push(`Performance data coverage is ${performanceDataCoverage}% - consider running campaigns longer to generate more comprehensive metrics for PPC Pal analysis`);
  }
  
  if (totals.campaignsWithSales < realApiCampaigns.length * 0.5) {
    recommendations.push('Less than 50% of campaigns have sales data - optimize targeting and keywords to improve conversion rates');
  }
  
  if (averageAcos > 30) {
    recommendations.push(`High ACOS detected (${averageAcos}%) - review bidding strategies and keyword relevance for PPC Pal optimization`);
  }
  
  if (clickThroughRate < 0.5) {
    recommendations.push(`Low CTR (${clickThroughRate}%) - optimize ad copy, images, and targeting for better PPC Pal performance`);
  }
  
  if (conversionRate < 10) {
    recommendations.push(`Low conversion rate (${conversionRate}%) - review product listings, pricing, and landing page optimization`);
  }
  
  if (totals.highPerformingCampaigns > 0) {
    recommendations.push(`Scale successful campaigns: ${totals.highPerformingCampaigns} high-performing campaigns detected - ideal for PPC Pal optimization`);
  }

  if (totals.optimizableCampaigns > 0) {
    recommendations.push(`${totals.optimizableCampaigns} campaigns ready for PPC Pal optimization with sufficient volume and performance data`);
  }

  return {
    metrics,
    dataQuality,
    recommendations
  };
};
