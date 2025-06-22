
import { WeeklyMetrics } from '@/types/weeklyMetrics';

export interface BaseMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  averageAcos: number;
  averageRoas: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
}

// Filter function to only allow real data
const filterRealDataOnly = (data: any[]): any[] => {
  return data.filter(item => 
    item.data_source !== 'simulated' && 
    item.data_source !== 'simulation' &&
    item.data_source !== 'fake' &&
    // Ensure we have meaningful metrics from real API data
    (item.sales > 0 || item.spend > 0 || item.orders > 0 || item.clicks > 0 || item.impressions > 0)
  );
};

export const calculateMetricsFromData = (data: any[]): BaseMetrics | null => {
  // Filter to only real data with actual metrics
  const realData = filterRealDataOnly(data);
  
  if (!realData.length) {
    console.log('No real data available for metrics calculation');
    return null;
  }

  const totalSales = realData.reduce((sum, d) => sum + (d.sales || 0), 0);
  const totalSpend = realData.reduce((sum, d) => sum + (d.spend || 0), 0);
  const totalOrders = realData.reduce((sum, d) => sum + (d.orders || 0), 0);
  const totalImpressions = realData.reduce((sum, d) => sum + (d.impressions || 0), 0);
  const totalClicks = realData.reduce((sum, d) => sum + (d.clicks || 0), 0);
  
  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  return {
    totalSales,
    totalSpend,
    totalProfit,
    totalOrders,
    totalImpressions,
    totalClicks,
    averageAcos,
    averageRoas,
    averageCtr,
    averageCpc,
    conversionRate
  };
};

export const calculateMetricsFromCampaigns = (campaigns: any[]): BaseMetrics | null => {
  // Filter to only real data campaigns with actual metrics
  const realCampaigns = filterRealDataOnly(campaigns);
  
  if (!realCampaigns.length) {
    console.log('No real campaign data available for metrics calculation');
    return null;
  }

  const totalSales = realCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = realCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = realCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalImpressions = realCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = realCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  
  const totalProfit = totalSales - totalSpend;
  const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

  return {
    totalSales,
    totalSpend,
    totalProfit,
    totalOrders,
    totalImpressions,
    totalClicks,
    averageAcos,
    averageRoas,
    averageCtr,
    averageCpc,
    conversionRate
  };
};

export const calculateWeekOverWeekChanges = (
  currentMetrics: BaseMetrics,
  previousMetrics: BaseMetrics | null
) => {
  if (!previousMetrics) {
    return {
      salesChange: 0,
      spendChange: 0,
      ordersChange: 0,
      profitChange: 0
    };
  }

  const salesChange = ((currentMetrics.totalSales - previousMetrics.totalSales) / Math.max(previousMetrics.totalSales, 1)) * 100;
  const spendChange = ((currentMetrics.totalSpend - previousMetrics.totalSpend) / Math.max(previousMetrics.totalSpend, 1)) * 100;
  const ordersChange = ((currentMetrics.totalOrders - previousMetrics.totalOrders) / Math.max(previousMetrics.totalOrders, 1)) * 100;
  const profitChange = ((currentMetrics.totalProfit - previousMetrics.totalProfit) / Math.max(Math.abs(previousMetrics.totalProfit), 1)) * 100;

  return {
    salesChange,
    spendChange,
    ordersChange,
    profitChange
  };
};
