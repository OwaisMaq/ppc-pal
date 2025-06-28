
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
}

export const processPerformanceData = (campaigns: CampaignData[]) => {
  console.log('=== PROCESSING OPTIMIZED REAL API DATA ===');
  console.log(`Input campaigns: ${campaigns.length}`);
  
  // Enhanced filtering for real API campaigns
  const realApiCampaigns = campaigns.filter(campaign => {
    const isRealApiData = campaign.data_source === 'api' && 
                         campaign.amazon_campaign_id && 
                         campaign.name;
    
    // Additional quality checks
    const hasMetrics = (campaign.impressions || 0) > 0 || 
                      (campaign.clicks || 0) > 0 || 
                      (campaign.spend || 0) > 0;
    
    return isRealApiData && hasMetrics;
  });
  
  console.log(`Real API campaigns with metrics: ${realApiCampaigns.length}`);
  
  // Enhanced data source breakdown
  const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
    const source = campaign.data_source || 'unknown';
    const quality = campaign.data_source === 'api' ? 'high-quality' : 'simulated';
    const key = `${source} (${quality})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // If no real API campaigns, return enhanced null metrics
  if (realApiCampaigns.length === 0) {
    console.log('❌ NO REAL API DATA AVAILABLE - Returning enhanced null metrics');
    
    const dataQuality: DataQuality = {
      hasRealData: false,
      realDataCampaigns: 0,
      totalCampaigns: campaigns.length,
      apiDataQuality: 'none',
      averageDataAge: '0 hours',
      dataSourceBreakdown,
      attributionWindowUsed: 'N/A',
      apiVersion: 'N/A'
    };
    
    return {
      metrics: null,
      dataQuality,
      recommendations: [
        'No real Amazon API data available',
        'Connect your Amazon Advertising account to get actual campaign performance',
        'Enable automatic data sync for real-time metrics',
        'Check Amazon API connection status in Settings'
      ]
    };
  }
  
  // Enhanced metrics calculation with optimized data processing
  const totals = realApiCampaigns.reduce(
    (acc, campaign) => {
      // Enhanced data validation
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
        highPerformingCampaigns: acc.highPerformingCampaigns + (campaign.roas && campaign.roas > 3 ? 1 : 0)
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
      highPerformingCampaigns: 0
    }
  );

  // Enhanced metric calculations
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

  // Enhanced performance metrics with additional insights
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
    dataSourceInfo: 'optimized-real-api-data'
  };

  // Enhanced data quality assessment
  const dataAge = realApiCampaigns[0]?.last_updated 
    ? Math.round((Date.now() - new Date(realApiCampaigns[0].last_updated).getTime()) / (1000 * 60 * 60))
    : 0;

  const dataQuality: DataQuality = {
    hasRealData: true,
    realDataCampaigns: realApiCampaigns.length,
    totalCampaigns: campaigns.length,
    apiDataQuality: dataAge < 1 ? 'excellent' : dataAge < 24 ? 'good' : 'poor',
    averageDataAge: `${dataAge} hours`,
    lastRealDataUpdate: realApiCampaigns[0]?.last_updated,
    dataSourceBreakdown,
    attributionWindowUsed: '30d', // Based on optimized API implementation
    apiVersion: 'v3'
  };

  console.log('✅ OPTIMIZED REAL API METRICS CALCULATED:', {
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalOrders: metrics.totalOrders,
    realCampaigns: realApiCampaigns.length,
    dataQuality: dataQuality.apiDataQuality,
    attributionWindow: dataQuality.attributionWindowUsed
  });

  // Enhanced recommendations based on data analysis
  const recommendations = [];
  
  if (totals.campaignsWithSales < realApiCampaigns.length * 0.5) {
    recommendations.push('Consider optimizing campaigns with low or no sales');
  }
  
  if (averageAcos > 30) {
    recommendations.push('High ACOS detected - review bidding strategies');
  }
  
  if (clickThroughRate < 0.5) {
    recommendations.push('Low CTR - optimize ad copy and targeting');
  }
  
  if (conversionRate < 5) {
    recommendations.push('Low conversion rate - review product listings and pricing');
  }
  
  if (totals.highPerformingCampaigns > 0) {
    recommendations.push(`Scale successful campaigns (${totals.highPerformingCampaigns} high-performing detected)`);
  }

  return {
    metrics,
    dataQuality,
    recommendations
  };
};
