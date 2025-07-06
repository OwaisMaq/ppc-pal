
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  console.log('=== CALCULATING PERFORMANCE METRICS ===');
  console.log('Total campaigns received:', campaigns.length);
  
  if (!campaigns || campaigns.length === 0) {
    console.log('No campaigns provided for metrics calculation');
    return null;
  }

  // Filter campaigns that have some data
  const activeCampaigns = campaigns.filter(campaign => 
    campaign.status === 'enabled' || campaign.sales > 0 || campaign.spend > 0
  );

  console.log('Active campaigns for calculation:', activeCampaigns.length);

  // Calculate totals
  const totals = campaigns.reduce((acc, campaign) => {
    acc.sales += campaign.sales || 0;
    acc.spend += campaign.spend || 0;
    acc.orders += campaign.orders || 0;
    acc.impressions += campaign.impressions || 0;
    acc.clicks += campaign.clicks || 0;
    return acc;
  }, {
    sales: 0,
    spend: 0,
    orders: 0,
    impressions: 0,
    clicks: 0
  });

  console.log('Calculated totals:', totals);

  // Calculate derived metrics
  const clickThroughRate = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;
  const averageAcos = totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0;
  const averageRoas = totals.spend > 0 ? totals.sales / totals.spend : 0;

  // Calculate profit (simple estimation: sales - spend)
  const totalProfit = totals.sales - totals.spend;

  const metrics: PerformanceMetrics = {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalProfit,
    totalOrders: totals.orders,
    activeCampaigns: activeCampaigns.length,
    totalCampaigns: campaigns.length,
    averageAcos,
    averageRoas,
    totalClicks: totals.clicks,
    totalImpressions: totals.impressions,
    clickThroughRate,
    averageCtr: clickThroughRate,
    averageCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversionRate,
    
    // Month-over-month changes (placeholder - would need historical data)
    salesChange: 0,
    spendChange: 0,
    profitChange: 0,
    ordersChange: 0,
    
    // Additional metrics
    averageCostPerUnit: totals.orders > 0 ? totals.spend / totals.orders : 0,
    
    // Data quality indicators
    hasSimulatedData: campaigns.some(c => !c.data_source || c.data_source !== 'amazon_api'),
    dataSourceInfo: `${campaigns.filter(c => c.data_source === 'amazon_api').length} API campaigns, ${campaigns.filter(c => !c.data_source || c.data_source !== 'amazon_api').length} simulated`
  };

  console.log('✅ METRICS CALCULATION COMPLETE');
  console.log('Final metrics:', metrics);
  
  return metrics;
};

// Legacy function kept for backwards compatibility
export const calculateMetricsLegacy = calculateMetrics;
