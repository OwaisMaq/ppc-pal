
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

interface DataQuality {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
}

interface ProcessingResult {
  metrics: PerformanceMetrics | null;
  dataQuality: DataQuality;
  recommendations: string[];
}

export const processPerformanceData = (campaigns: CampaignData[]): ProcessingResult => {
  console.log('=== ENHANCED PERFORMANCE DATA PROCESSING ===');
  console.log(`Processing ${campaigns.length} campaigns`);

  // Initialize data quality analysis
  const dataQuality: DataQuality = {
    hasRealData: false,
    realDataCampaigns: 0,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: 0,
    dataSourceBreakdown: {}
  };

  const recommendations: string[] = [];

  // Analyze data sources and quality
  campaigns.forEach(campaign => {
    const source = campaign.data_source || 'unknown';
    dataQuality.dataSourceBreakdown[source] = (dataQuality.dataSourceBreakdown[source] || 0) + 1;
    
    if (source === 'api') {
      dataQuality.realDataCampaigns++;
    } else if (source === 'simulated') {
      dataQuality.simulatedCampaigns++;
    }
  });

  dataQuality.hasRealData = dataQuality.realDataCampaigns > 0;

  console.log('Data quality analysis:', {
    hasRealData: dataQuality.hasRealData,
    realDataCampaigns: dataQuality.realDataCampaigns,
    totalCampaigns: dataQuality.totalCampaigns,
    dataSourceBreakdown: dataQuality.dataSourceBreakdown
  });

  // Filter campaigns that have performance metrics
  const campaignsWithMetrics = campaigns.filter(campaign => {
    const hasMetrics = (campaign.sales || 0) > 0 || 
                     (campaign.spend || 0) > 0 || 
                     (campaign.orders || 0) > 0 ||
                     (campaign.clicks || 0) > 0 ||
                     (campaign.impressions || 0) > 0;
    
    if (!hasMetrics) {
      console.log(`Campaign ${campaign.name} has no metrics data`);
    }
    
    return hasMetrics;
  });

  console.log(`Campaigns with metrics: ${campaignsWithMetrics.length} out of ${campaigns.length}`);

  // Generate recommendations based on data quality
  if (!dataQuality.hasRealData) {
    recommendations.push('No real Amazon API data found. Connect your Amazon account and sync to get actual performance metrics.');
  }
  
  if (dataQuality.realDataCampaigns > 0 && dataQuality.simulatedCampaigns > 0) {
    recommendations.push(`${dataQuality.realDataCampaigns} campaigns have real data, but ${dataQuality.simulatedCampaigns} are using simulated data.`);
  }
  
  if (campaignsWithMetrics.length === 0) {
    recommendations.push('No campaigns with performance metrics found. Ensure your campaigns have recent activity and try re-syncing.');
    return { metrics: null, dataQuality, recommendations };
  }

  // Calculate aggregate metrics from campaigns with performance data
  const totalSales = campaignsWithMetrics.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = campaignsWithMetrics.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = campaignsWithMetrics.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalClicks = campaignsWithMetrics.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalImpressions = campaignsWithMetrics.reduce((sum, c) => sum + (c.impressions || 0), 0);

  // Calculate derived metrics
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Count active campaigns (enabled status)
  const activeCampaigns = campaignsWithMetrics.filter(c => c.status === 'enabled').length;

  // Calculate profit (simplified: sales - spend)
  const totalProfit = totalSales - totalSpend;

  const metrics: PerformanceMetrics = {
    totalSales,
    totalSpend,
    totalProfit,
    totalOrders,
    totalClicks,
    totalImpressions,
    activeCampaigns,
    averageAcos,
    averageRoas,
    averageCpc,
    conversionRate,
    ctr
  };

  console.log('✅ ENHANCED METRICS CALCULATED:', {
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalOrders: metrics.totalOrders,
    activeCampaigns: metrics.activeCampaigns,
    hasRealData: dataQuality.hasRealData,
    dataQuality: dataQuality.dataSourceBreakdown
  });

  return { metrics, dataQuality, recommendations };
};
