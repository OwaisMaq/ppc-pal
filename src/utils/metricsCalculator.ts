
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';
import { filterRealDataOnly, getRealDataStats } from './dataFilter';

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  console.log('=== Calculating Performance Metrics with Real Data Only ===');
  console.log('Total campaigns:', campaigns.length);
  
  const { realDataCampaigns, realDataCount, simulatedCount, hasRealData } = getRealDataStats(campaigns);
  
  console.log('Real data campaigns:', realDataCount);
  console.log('Simulated campaigns (excluded):', simulatedCount);

  if (!hasRealData) {
    console.log('No real data available - returning null');
    return null;
  }

  // Log real campaign metrics for debugging
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

  // Calculate current metrics from real data only
  const totalSales = realDataCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = realDataCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = realDataCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalImpressions = realDataCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = realDataCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

  // Calculate previous month metrics for comparison
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

  console.log('=== Final Calculated Metrics with Real Data Only ===');
  console.log({
    totalSales: `$${totalSales.toFixed(2)}`,
    totalSpend: `$${totalSpend.toFixed(2)}`,
    totalProfit: `$${totalProfit.toFixed(2)}`,
    totalOrders,
    averageAcos: `${averageAcos.toFixed(2)}%`,
    averageRoas: `${averageRoas.toFixed(2)}x`,
    campaignCount: realDataCount,
    salesChange: `${salesChange.toFixed(1)}%`,
    spendChange: `${spendChange.toFixed(1)}%`,
    ordersChange: `${ordersChange.toFixed(1)}%`,
    profitChange: `${profitChange.toFixed(1)}%`,
    dataQuality: 'Real data only'
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
    hasSimulatedData: false,
    dataSourceInfo: `Using real data from ${realDataCount} campaigns only`
  };
};
