
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

export interface ProcessedPerformanceData {
  metrics: PerformanceMetrics | null;
  dataQuality: {
    hasRealData: boolean;
    realDataCampaigns: number;
    totalCampaigns: number;
    simulatedCampaigns: number;
    dataSourceBreakdown: Record<string, number>;
  };
  recommendations: string[];
}

export const processPerformanceData = (campaigns: CampaignData[]): ProcessedPerformanceData => {
  console.log('=== PROCESSING PERFORMANCE DATA ===');
  console.log(`Processing ${campaigns.length} total campaigns`);

  // Analyze data sources
  const dataSourceBreakdown: Record<string, number> = {};
  campaigns.forEach(campaign => {
    const source = campaign.data_source || 'unknown';
    dataSourceBreakdown[source] = (dataSourceBreakdown[source] || 0) + 1;
  });

  console.log('Data source breakdown:', dataSourceBreakdown);

  // Filter for real API data with meaningful metrics
  const realDataCampaigns = campaigns.filter(campaign => {
    const isRealData = campaign.data_source === 'api';
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    
    if (isRealData && !hasMetrics) {
      console.log(`Campaign ${campaign.name}: Real API data but no metrics yet`);
    }
    
    return isRealData && hasMetrics;
  });

  const dataQuality = {
    hasRealData: realDataCampaigns.length > 0,
    realDataCampaigns: realDataCampaigns.length,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: campaigns.length - realDataCampaigns.length,
    dataSourceBreakdown
  };

  console.log('Data quality analysis:', dataQuality);

  // Generate recommendations based on data state
  const recommendations: string[] = [];
  
  if (campaigns.length === 0) {
    recommendations.push('No campaigns found. Check your Amazon Advertising account setup.');
    recommendations.push('Ensure your Amazon account has active advertising campaigns.');
  } else if (realDataCampaigns.length === 0) {
    if (dataSourceBreakdown.api > 0) {
      recommendations.push('API campaigns found but no performance data yet. This is normal for new campaigns.');
      recommendations.push('Performance data typically appears 24-48 hours after campaign activity.');
    } else {
      recommendations.push('No real API data available. Try syncing your Amazon connection.');
      recommendations.push('Verify your Amazon Advertising account has proper permissions.');
    }
  } else if (realDataCampaigns.length < campaigns.length) {
    recommendations.push(`${realDataCampaigns.length} of ${campaigns.length} campaigns have real performance data.`);
    recommendations.push('Some campaigns may be new or inactive.');
  }

  // Calculate metrics only from real data
  let metrics: PerformanceMetrics | null = null;
  
  if (realDataCampaigns.length > 0) {
    console.log(`Calculating metrics from ${realDataCampaigns.length} real data campaigns`);
    
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
    const averageAcos = totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0;
    const averageRoas = totals.spend > 0 ? totals.sales / totals.spend : 0;
    const averageCostPerUnit = totals.orders > 0 ? totals.spend / totals.orders : 0;
    const averageCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const averageCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;
    const totalProfit = totals.sales - totals.spend;

    // Calculate period changes (using previous period data if available)
    const previousTotals = realDataCampaigns.reduce(
      (acc, campaign) => ({
        sales: acc.sales + (campaign.previous_month_sales || 0),
        spend: acc.spend + (campaign.previous_month_spend || 0),
        orders: acc.orders + (campaign.previous_month_orders || 0),
      }),
      { sales: 0, spend: 0, orders: 0 }
    );

    const salesChange = previousTotals.sales > 0 
      ? ((totals.sales - previousTotals.sales) / previousTotals.sales) * 100 
      : 0;
    const spendChange = previousTotals.spend > 0 
      ? ((totals.spend - previousTotals.spend) / previousTotals.spend) * 100 
      : 0;
    const ordersChange = previousTotals.orders > 0 
      ? ((totals.orders - previousTotals.orders) / previousTotals.orders) * 100 
      : 0;
    const previousProfit = previousTotals.sales - previousTotals.spend;
    const profitChange = previousProfit > 0 
      ? ((totalProfit - previousProfit) / previousProfit) * 100 
      : 0;

    metrics = {
      totalSales: totals.sales,
      totalSpend: totals.spend,
      totalProfit,
      totalOrders: totals.orders,
      averageAcos,
      averageRoas,
      averageCostPerUnit,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      averageCtr,
      averageCpc,
      conversionRate,
      salesChange,
      spendChange,
      ordersChange,
      profitChange,
      hasSimulatedData: false,
      dataSourceInfo: `Real Amazon API data from ${realDataCampaigns.length} campaigns`
    };

    console.log('✅ Performance metrics calculated:', {
      totalSales: metrics.totalSales.toFixed(2),
      totalSpend: metrics.totalSpend.toFixed(2),
      totalOrders: metrics.totalOrders,
      averageAcos: metrics.averageAcos.toFixed(2) + '%',
      campaignsUsed: realDataCampaigns.length
    });
  } else {
    console.log('❌ No real data available for metrics calculation');
  }

  return {
    metrics,
    dataQuality,
    recommendations
  };
};

export const enhanceMetricsWithTrends = (
  currentMetrics: PerformanceMetrics,
  historicalData: any[]
): PerformanceMetrics => {
  console.log('Enhancing metrics with trend data from', historicalData.length, 'historical records');
  
  // This could be enhanced to calculate more sophisticated trends
  // For now, return the current metrics as-is
  return currentMetrics;
};
