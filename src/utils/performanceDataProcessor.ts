
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
}

export const processPerformanceData = (campaigns: CampaignData[]) => {
  console.log('=== PROCESSING REAL API DATA ONLY ===');
  console.log(`Input campaigns: ${campaigns.length}`);
  
  // Filter to only real API campaigns with actual data
  const realApiCampaigns = campaigns.filter(campaign => {
    return campaign.data_source === 'api' && 
           campaign.amazon_campaign_id && 
           campaign.name;
  });
  
  console.log(`Real API campaigns: ${realApiCampaigns.length}`);
  
  // Calculate data source breakdown
  const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
    const source = campaign.data_source || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // If no real API campaigns, return null metrics
  if (realApiCampaigns.length === 0) {
    console.log('❌ NO REAL API DATA AVAILABLE - Returning null metrics');
    
    const dataQuality: DataQuality = {
      hasRealData: false,
      realDataCampaigns: 0,
      totalCampaigns: campaigns.length,
      apiDataQuality: 'none',
      averageDataAge: '0 hours',
      dataSourceBreakdown
    };
    
    return {
      metrics: null,
      dataQuality,
      recommendations: [
        'No real Amazon API data available',
        'Please sync your Amazon connection to get actual campaign data'
      ]
    };
  }
  
  // Calculate metrics ONLY from real API campaigns
  const totals = realApiCampaigns.reduce(
    (acc, campaign) => ({
      sales: acc.sales + (campaign.sales || 0),
      spend: acc.spend + (campaign.spend || 0),
      orders: acc.orders + (campaign.orders || 0),
      impressions: acc.impressions + (campaign.impressions || 0),
      clicks: acc.clicks + (campaign.clicks || 0),
      activeCampaigns: acc.activeCampaigns + (campaign.status === 'enabled' ? 1 : 0),
      validAcos: campaign.acos ? [...acc.validAcos, campaign.acos] : acc.validAcos,
      validRoas: campaign.roas ? [...acc.validRoas, campaign.roas] : acc.validRoas,
    }),
    { 
      sales: 0, 
      spend: 0, 
      orders: 0, 
      impressions: 0, 
      clicks: 0, 
      activeCampaigns: 0,
      validAcos: [] as number[], 
      validRoas: [] as number[] 
    }
  );

  const averageAcos = totals.validAcos.length > 0 
    ? totals.validAcos.reduce((a, b) => a + b, 0) / totals.validAcos.length 
    : 0;

  const averageRoas = totals.validRoas.length > 0 
    ? totals.validRoas.reduce((a, b) => a + b, 0) / totals.validRoas.length 
    : 0;

  const clickThroughRate = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;

  const metrics: PerformanceMetrics = {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalProfit: totals.sales - totals.spend,
    totalOrders: totals.orders,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    activeCampaigns: totals.activeCampaigns,
    totalCampaigns: realApiCampaigns.length,
    averageAcos,
    averageRoas,
    clickThroughRate,
    averageCtr: clickThroughRate,
    averageCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversionRate,
    salesChange: 0,
    spendChange: 0,
    profitChange: 0,
    ordersChange: 0,
    averageCostPerUnit: totals.orders > 0 ? totals.spend / totals.orders : 0,
    hasSimulatedData: false,
    dataSourceInfo: 'real-api-data'
  };

  const dataQuality: DataQuality = {
    hasRealData: true,
    realDataCampaigns: realApiCampaigns.length,
    totalCampaigns: campaigns.length,
    apiDataQuality: 'excellent',
    averageDataAge: '0 hours',
    lastRealDataUpdate: realApiCampaigns[0]?.last_updated,
    dataSourceBreakdown
  };

  console.log('✅ REAL API METRICS CALCULATED:', {
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalOrders: metrics.totalOrders,
    realCampaigns: realApiCampaigns.length
  });

  return {
    metrics,
    dataQuality,
    recommendations: []
  };
};
