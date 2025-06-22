
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';
import { analyzeDataQuality } from './dataQualityAnalyzer';

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics => {
  console.log('=== Calculating Performance Metrics with Real Data ===');
  console.log('Available campaigns:', campaigns.length);
  
  if (!campaigns.length) {
    console.log('No campaigns available');
    return {
      totalSales: 0,
      totalSpend: 0,
      totalProfit: 0,
      totalOrders: 0,
      averageAcos: 0,
      averageRoas: 0,
      averageCostPerUnit: 0,
      totalImpressions: 0,
      totalClicks: 0,
      averageCtr: 0,
      averageCpc: 0,
      conversionRate: 0,
      salesChange: 0,
      spendChange: 0,
      ordersChange: 0,
      profitChange: 0,
      hasSimulatedData: false,
      dataSourceInfo: 'No data available'
    };
  }

  // Log campaign metrics for debugging
  console.log('Campaign metrics breakdown:');
  campaigns.forEach((campaign, index) => {
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

  // Calculate current metrics
  const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = campaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

  // Calculate previous month metrics for comparison
  const previousMonthSales = campaigns.reduce((sum, c) => sum + (c.previous_month_sales || 0), 0);
  const previousMonthSpend = campaigns.reduce((sum, c) => sum + (c.previous_month_spend || 0), 0);
  const previousMonthOrders = campaigns.reduce((sum, c) => sum + (c.previous_month_orders || 0), 0);
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

  // Analyze data quality
  const { hasSimulatedData, dataSourceInfo } = analyzeDataQuality(campaigns);

  console.log('=== Final Calculated Metrics with Real Changes ===');
  console.log({
    totalSales: `$${totalSales.toFixed(2)}`,
    totalSpend: `$${totalSpend.toFixed(2)}`,
    totalProfit: `$${totalProfit.toFixed(2)}`,
    totalOrders,
    averageAcos: `${averageAcos.toFixed(2)}%`,
    averageRoas: `${averageRoas.toFixed(2)}x`,
    campaignCount: campaigns.length,
    salesChange: `${salesChange.toFixed(1)}%`,
    spendChange: `${spendChange.toFixed(1)}%`,
    ordersChange: `${ordersChange.toFixed(1)}%`,
    profitChange: `${profitChange.toFixed(1)}%`,
    dataQuality: dataSourceInfo,
    hasSimulatedData
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
    hasSimulatedData,
    dataSourceInfo
  };
};
