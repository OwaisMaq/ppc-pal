
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  console.log('=== CALCULATING REAL DATA METRICS ===');
  console.log('Total campaigns received:', campaigns.length);
  
  if (!campaigns || campaigns.length === 0) {
    console.log('No campaigns provided for metrics calculation');
    return null;
  }

  // STRICT FILTER: Only include campaigns with real API data
  const realDataCampaigns = campaigns.filter(campaign => {
    const isRealData = campaign.data_source === 'api' && 
                      campaign.data_source !== 'simulated' && 
                      campaign.data_source !== 'simulation';
    
    // Additional validation: Check if campaign has meaningful metrics
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    
    const isValid = isRealData && hasMetrics;
    
    if (!isValid) {
      console.log(`Excluding campaign ${campaign.name}: data_source=${campaign.data_source}, hasMetrics=${hasMetrics}`);
    } else {
      console.log(`✓ Including campaign ${campaign.name}: REAL API data with metrics`);
    }
    
    return isValid;
  });

  console.log(`Filtered to ${realDataCampaigns.length} campaigns with real API data`);
  
  if (realDataCampaigns.length === 0) {
    console.log('❌ NO REAL DATA AVAILABLE - All campaigns are simulated or have no metrics');
    return null;
  }

  // Calculate totals from real data only
  const totals = realDataCampaigns.reduce(
    (acc, campaign) => ({
      sales: acc.sales + (campaign.sales || 0),
      spend: acc.spend + (campaign.spend || 0),
      orders: acc.orders + (campaign.orders || 0),
      clicks: acc.clicks + (campaign.clicks || 0),
      impressions: acc.impressions + (campaign.impressions || 0),
    }),
    { sales: 0, spend: 0, orders: 0, clicks: 0, impressions: 0 }
  );

  // Calculate derived metrics
  const averageOrderValue = totals.orders > 0 ? totals.sales / totals.orders : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;
  const acos = totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0;
  const roas = totals.spend > 0 ? totals.sales / totals.spend : 0;

  // Calculate previous period metrics for comparison (real data only)
  const previousTotals = realDataCampaigns.reduce(
    (acc, campaign) => ({
      sales: acc.sales + (campaign.previous_month_sales || 0),
      spend: acc.spend + (campaign.previous_month_spend || 0),
      orders: acc.orders + (campaign.previous_month_orders || 0),
    }),
    { sales: 0, spend: 0, orders: 0 }
  );

  // Calculate period changes
  const salesChange = previousTotals.sales > 0 
    ? ((totals.sales - previousTotals.sales) / previousTotals.sales) * 100 
    : 0;
  const spendChange = previousTotals.spend > 0 
    ? ((totals.spend - previousTotals.spend) / previousTotals.spend) * 100 
    : 0;
  const ordersChange = previousTotals.orders > 0 
    ? ((totals.orders - previousTotals.orders) / previousTotals.orders) * 100 
    : 0;

  const metrics: PerformanceMetrics = {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalOrders: totals.orders,
    totalClicks: totals.clicks,
    totalImpressions: totals.impressions,
    averageOrderValue,
    clickThroughRate: ctr,
    conversionRate,
    acos,
    roas,
    campaignCount: realDataCampaigns.length,
    // Period changes
    salesChange,
    spendChange,
    ordersChange,
    // Previous period totals
    previousSales: previousTotals.sales,
    previousSpend: previousTotals.spend,
    previousOrders: previousTotals.orders
  };

  console.log('✅ REAL DATA METRICS CALCULATED:', {
    campaignsUsed: realDataCampaigns.length,
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalOrders: metrics.totalOrders,
    acos: metrics.acos?.toFixed(2),
    roas: metrics.roas?.toFixed(2)
  });

  return metrics;
};
