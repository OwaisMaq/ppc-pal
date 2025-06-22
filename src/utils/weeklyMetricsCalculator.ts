
import { CampaignData } from '@/hooks/useCampaignData';

export interface WeeklyMetrics {
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
  // Week-over-week changes
  salesChange: number;
  spendChange: number;
  ordersChange: number;
  profitChange: number;
  // Data quality
  hasRealData: boolean;
  dataSourceInfo: string;
}

export const calculateMetricsFromData = (data: any[]): WeeklyMetrics | null => {
  console.log('Calculating metrics from historical data:', data.length, 'records');
  
  if (!data || data.length === 0) {
    return null;
  }

  // Filter out simulated data
  const realData = data.filter(record => 
    record.data_source === 'api'
  );

  console.log(`Filtered to ${realData.length} real data records from ${data.length} total`);

  if (realData.length === 0) {
    console.log('No real data available in historical records');
    return null;
  }

  const totals = realData.reduce(
    (acc, record) => ({
      sales: acc.sales + (record.sales || 0),
      spend: acc.spend + (record.spend || 0),
      orders: acc.orders + (record.orders || 0),
      clicks: acc.clicks + (record.clicks || 0),
      impressions: acc.impressions + (record.impressions || 0),
    }),
    { sales: 0, spend: 0, orders: 0, clicks: 0, impressions: 0 }
  );

  const totalProfit = totals.sales - totals.spend;

  return {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalProfit,
    totalOrders: totals.orders,
    totalClicks: totals.clicks,
    totalImpressions: totals.impressions,
    averageAcos: totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0,
    averageRoas: totals.spend > 0 ? totals.sales / totals.spend : 0,
    averageCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    averageCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversionRate: totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0,
    salesChange: 0,
    spendChange: 0,
    ordersChange: 0,
    profitChange: 0,
    hasRealData: true,
    dataSourceInfo: `Real historical data (${realData.length} records)`
  };
};

export const calculateMetricsFromCampaigns = (campaigns: CampaignData[]): WeeklyMetrics | null => {
  console.log('Calculating metrics from campaigns:', campaigns.length);
  
  if (!campaigns || campaigns.length === 0) {
    return null;
  }

  // STRICT FILTER: Only real API data campaigns
  const realDataCampaigns = campaigns.filter(campaign => {
    const isRealData = campaign.data_source === 'api';
    
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    
    return isRealData && hasMetrics;
  });

  console.log(`Filtered to ${realDataCampaigns.length} real data campaigns`);

  if (realDataCampaigns.length === 0) {
    console.log('No real data campaigns available');
    return null;
  }

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

  const totalProfit = totals.sales - totals.spend;

  return {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalProfit,
    totalOrders: totals.orders,
    totalClicks: totals.clicks,
    totalImpressions: totals.impressions,
    averageAcos: totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0,
    averageRoas: totals.spend > 0 ? totals.sales / totals.spend : 0,
    averageCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    averageCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversionRate: totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0,
    salesChange: 0,
    spendChange: 0,
    ordersChange: 0,
    profitChange: 0,
    hasRealData: true,
    dataSourceInfo: `Real campaign data (${realDataCampaigns.length} campaigns)`
  };
};

export const calculateWeekOverWeekChanges = (
  currentMetrics: WeeklyMetrics,
  previousMetrics: WeeklyMetrics | null
): Partial<WeeklyMetrics> => {
  if (!previousMetrics) {
    return {
      salesChange: 0,
      spendChange: 0,
      ordersChange: 0,
      profitChange: 0
    };
  }

  return {
    salesChange: previousMetrics.totalSales > 0 
      ? ((currentMetrics.totalSales - previousMetrics.totalSales) / previousMetrics.totalSales) * 100 
      : 0,
    spendChange: previousMetrics.totalSpend > 0 
      ? ((currentMetrics.totalSpend - previousMetrics.totalSpend) / previousMetrics.totalSpend) * 100 
      : 0,
    ordersChange: previousMetrics.totalOrders > 0 
      ? ((currentMetrics.totalOrders - previousMetrics.totalOrders) / previousMetrics.totalOrders) * 100 
      : 0,
    profitChange: previousMetrics.totalProfit > 0 
      ? ((currentMetrics.totalProfit - previousMetrics.totalProfit) / previousMetrics.totalProfit) * 100 
      : 0
  };
};
