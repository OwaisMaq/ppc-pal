
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

// Strict filter for real data only
const filterRealDataCampaigns = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from API (not simulated)
    const isRealSource = campaign.data_source !== 'simulated' && 
                        campaign.data_source !== 'simulation' &&
                        campaign.data_source !== 'fake';
    
    // Must have actual performance metrics
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    
    return isRealSource && hasMetrics;
  });
};

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  console.log('=== Calculating Performance Metrics - REAL DATA ONLY ===');
  console.log('Total campaigns provided:', campaigns.length);
  
  if (!campaigns.length) {
    console.log('No campaigns available - returning null');
    return null;
  }

  // Filter for real data campaigns only
  const realDataCampaigns = filterRealDataCampaigns(campaigns);
  
  console.log('Real data campaigns found:', realDataCampaigns.length);

  if (!realDataCampaigns.length) {
    console.log('No real data campaigns available - returning null');
    return null;
  }

  // Log campaign metrics for debugging
  console.log('Real campaign metrics breakdown:');
  realDataCampaigns.forEach((campaign, index) => {
    console.log(`  ${index + 1}. ${campaign.name} [${campaign.data_source || 'api'}]:`, {
      sales: campaign.sales,
      spend: campaign.spend,
      orders: campaign.orders,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      acos: campaign.acos,
      roas: campaign.roas,
      previousMonthSales: campaign.previous_month_sales,
      previousMonthSpend: campaign.previous_month_spend,
      previousMonthOrders: campaign.previous_month_orders
    });
  });

  // Calculate current metrics from real data campaigns only
  const totalSales = realDataCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = realDataCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = realDataCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalImpressions = realDataCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = realDataCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

  // Calculate previous month metrics for comparison (real data only)
  const previousMonthSales = realDataCampaigns.reduce((sum, c) => sum + (c.previous_month_sales || 0), 0);
  const previousMonthSpend = realDataCampaigns.reduce((sum, c) => sum + (c.previous_month_spend || 0), 0);
  const previousMonthOrders = realDataCampaigns.reduce((sum, c) => sum + (c.previous_month_orders || 0), 0);
  const previousMonthProfit = previousMonthSales - previousMonthSpend;

  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCostPerUnit = totalOrders > 0 ? totalSpend / totalOrders : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  // Calculate month-over-month changes
  const salesChange = previousMonthSales > 0 
    ? ((totalSales - previousMonthSales) / previousMonthSales) * 100 
    : 0;
  
  const spendChange = previousMonthSpend > 0 
    ? ((totalSpend - previousMonthSpend) / previousMonthSpend) * 100 
    : 0;
  
  const ordersChange = previousMonthOrders > 0 
    ? ((totalOrders - previousMonthOrders) / previousMonthOrders) * 100 
    : 0;
  
  const profitChange = previousMonthProfit !== 0 
    ? ((totalProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100 
    : 0;

  const dataSourceInfo = `Real data from ${realDataCampaigns.length} campaigns (Amazon API)`;

  console.log('=== Final Calculated Metrics (Real Data Only) ===');
  console.log({
    totalSales: `$${totalSales.toFixed(2)}`,
    totalSpend: `$${totalSpend.toFixed(2)}`,
    totalProfit: `$${totalProfit.toFixed(2)}`,
    totalOrders,
    averageAcos: `${averageAcos.toFixed(2)}%`,
    averageRoas: `${averageRoas.toFixed(2)}x`,
    campaignCount: realDataCampaigns.length,
    salesChange: `${salesChange.toFixed(1)}%`,
    spendChange: `${spendChange.toFixed(1)}%`,
    ordersChange: `${ordersChange.toFixed(1)}%`,
    profitChange: `${profitChange.toFixed(1)}%`,
    dataQuality: dataSourceInfo
  });

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
    hasSimulatedData: false, // Never has simulated data
    dataSourceInfo
  };
};
