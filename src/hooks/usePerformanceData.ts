
import { useState, useEffect } from 'react';
import { useCampaignData } from './useCampaignData';
import { useKeywordData } from './useKeywordData';
import { useAmazonConnections } from './useAmazonConnections';

export interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  averageAcos: number;
  averageRoas: number;
  averageCostPerUnit: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
  // Month-over-month changes
  salesChange: number;
  spendChange: number;
  ordersChange: number;
  profitChange: number;
  // Data quality indicators
  hasSimulatedData: boolean;
  dataSourceInfo: string;
}

export const usePerformanceData = (connectionId?: string, selectedCountry?: string, selectedCampaign?: string) => {
  const { connections } = useAmazonConnections();
  const { campaigns, loading: campaignsLoading } = useCampaignData(connectionId);
  const { keywords, loading: keywordsLoading } = useKeywordData(connectionId);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (campaignsLoading || keywordsLoading) return;

    calculateMetrics();
  }, [campaigns, keywords, campaignsLoading, keywordsLoading, connections, selectedCountry, selectedCampaign]);

  const calculateMetrics = () => {
    console.log('=== Calculating Performance Metrics with Real Data ===');
    console.log('Available campaigns:', campaigns.length);
    console.log('Available connections:', connections.length);
    
    if (!campaigns.length && !keywords.length) {
      console.log('No campaigns or keywords available');
      setMetrics(null);
      return;
    }

    // Filter campaigns based on selected country
    let filteredCampaigns = campaigns;
    
    if (selectedCountry && selectedCountry !== 'all') {
      // Find connections for the selected country
      const countryConnections = connections
        .filter(conn => conn.marketplace_id === selectedCountry)
        .map(conn => conn.id);
      
      filteredCampaigns = campaigns.filter(campaign => 
        countryConnections.includes(campaign.connection_id)
      );
      
      console.log(`Filtered to ${filteredCampaigns.length} campaigns for country ${selectedCountry}`);
    }

    // Filter by specific campaign if selected
    if (selectedCampaign && selectedCampaign !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        campaign.id === selectedCampaign
      );
      
      console.log(`Filtered to ${filteredCampaigns.length} campaigns for campaign ${selectedCampaign}`);
    }

    // Check data sources and quality
    const simulatedDataCampaigns = filteredCampaigns.filter(c => c.data_source === 'simulated');
    const hasSimulatedData = simulatedDataCampaigns.length > 0;
    
    let dataSourceInfo = '';
    if (hasSimulatedData) {
      if (simulatedDataCampaigns.length === filteredCampaigns.length) {
        dataSourceInfo = 'All data is simulated due to API limitations';
      } else {
        dataSourceInfo = `${simulatedDataCampaigns.length} of ${filteredCampaigns.length} campaigns using simulated data`;
      }
    } else {
      dataSourceInfo = 'All data from Amazon API';
    }

    // Log campaign metrics for debugging
    console.log('Campaign metrics breakdown:');
    filteredCampaigns.forEach((campaign, index) => {
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

    // Calculate current metrics from filtered campaigns
    const totalSales = filteredCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalOrders = filteredCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
    const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

    // Calculate previous month metrics for comparison
    const previousMonthSales = filteredCampaigns.reduce((sum, c) => sum + (c.previous_month_sales || 0), 0);
    const previousMonthSpend = filteredCampaigns.reduce((sum, c) => sum + (c.previous_month_spend || 0), 0);
    const previousMonthOrders = filteredCampaigns.reduce((sum, c) => sum + (c.previous_month_orders || 0), 0);
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

    console.log('=== Final Calculated Metrics with Real Changes ===');
    console.log({
      totalSales: `$${totalSales.toFixed(2)}`,
      totalSpend: `$${totalSpend.toFixed(2)}`,
      totalProfit: `$${totalProfit.toFixed(2)}`,
      totalOrders,
      averageAcos: `${averageAcos.toFixed(2)}%`,
      averageRoas: `${averageRoas.toFixed(2)}x`,
      campaignCount: filteredCampaigns.length,
      salesChange: `${salesChange.toFixed(1)}%`,
      spendChange: `${spendChange.toFixed(1)}%`,
      ordersChange: `${ordersChange.toFixed(1)}%`,
      profitChange: `${profitChange.toFixed(1)}%`,
      dataQuality: dataSourceInfo,
      hasSimulatedData
    });

    setMetrics({
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
    });
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: campaigns.length > 0 || keywords.length > 0
  };
};
