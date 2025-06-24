
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics, DataQualityInfo } from '@/types/performance';

export const processPerformanceData = (
  campaigns: CampaignData[]
): {
  metrics: PerformanceMetrics | null;
  dataQuality: DataQualityInfo;
  recommendations: string[];
} => {
  console.log('=== PROCESSING PERFORMANCE DATA ===');
  console.log(`Input campaigns: ${campaigns.length}`);

  if (!campaigns || campaigns.length === 0) {
    console.log('❌ No campaigns provided for processing');
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

  // Analyze data quality
  const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
    const source = campaign.data_source || 'undefined';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const realDataCampaigns = campaigns.filter(c => c.data_source === 'api').length;
  const simulatedCampaigns = campaigns.filter(c => c.data_source === 'simulated').length;
  const hasRealData = realDataCampaigns > 0;

  console.log('Data quality analysis:', {
    totalCampaigns: campaigns.length,
    realDataCampaigns,
    simulatedCampaigns,
    dataSourceBreakdown,
    hasRealData
  });

  // Filter campaigns with any performance data
  const campaignsWithData = campaigns.filter(campaign => {
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    return hasMetrics;
  });

  console.log(`Campaigns with performance data: ${campaignsWithData.length}`);

  if (campaignsWithData.length === 0) {
    console.log('❌ No campaigns with performance metrics found');
    return {
      metrics: null,
      dataQuality: {
        hasRealData,
        realDataCampaigns,
        totalCampaigns: campaigns.length,
        simulatedCampaigns,
        dataSourceBreakdown
      },
      recommendations: [
        'No performance metrics found in campaign data.',
        'Try re-syncing your Amazon connection.',
        'Ensure your campaigns have recent activity and performance data.'
      ]
    };
  }

  // Calculate metrics from campaigns with data
  const totalSales = campaignsWithData.reduce((sum, campaign) => sum + (campaign.sales || 0), 0);
  const totalSpend = campaignsWithData.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  const totalOrders = campaignsWithData.reduce((sum, campaign) => sum + (campaign.orders || 0), 0);
  const totalClicks = campaignsWithData.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
  const totalImpressions = campaignsWithData.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);

  // Count active campaigns (enabled status)
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'enabled').length;

  // Calculate derived metrics
  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  const metrics: PerformanceMetrics = {
    totalSales: Number(totalSales.toFixed(2)),
    totalSpend: Number(totalSpend.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalOrders,
    activeCampaigns,
    totalCampaigns: campaigns.length,
    averageAcos: Number(averageAcos.toFixed(2)),
    averageRoas: Number(averageRoas.toFixed(2)),
    totalClicks,
    totalImpressions,
    averageCtr: Number(averageCtr.toFixed(2)),
    averageCpc: Number(averageCpc.toFixed(2)),
    conversionRate: Number(conversionRate.toFixed(2))
  };

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!hasRealData) {
    recommendations.push('Currently showing simulated data for development purposes.');
    recommendations.push('Connect your Amazon Ads account to see real performance metrics.');
  } else if (simulatedCampaigns > 0) {
    recommendations.push(`${realDataCampaigns} campaigns have real data, ${simulatedCampaigns} are simulated.`);
  }

  if (averageAcos > 30) {
    recommendations.push('Consider optimizing campaigns with high ACoS (>30%).');
  }

  if (averageRoas < 2) {
    recommendations.push('Focus on improving ROAS - aim for 2x or higher.');
  }

  console.log('✅ Successfully calculated performance metrics:', metrics);

  return {
    metrics,
    dataQuality: {
      hasRealData,
      realDataCampaigns,
      totalCampaigns: campaigns.length,
      simulatedCampaigns,
      dataSourceBreakdown
    },
    recommendations
  };
};
