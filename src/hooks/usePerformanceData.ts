
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
    console.log('Calculating performance metrics...');
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

    console.log('Processing campaigns for metrics:', filteredCampaigns.map(c => ({
      name: c.name,
      sales: c.sales,
      spend: c.spend,
      orders: c.orders,
      impressions: c.impressions,
      clicks: c.clicks
    })));

    // Calculate metrics from filtered campaigns
    const totalSales = filteredCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalOrders = filteredCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0);
    const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

    const totalProfit = totalSales - totalSpend;
    const averageAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const averageRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const averageCostPerUnit = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    console.log('Calculated metrics:', {
      totalSales,
      totalSpend,
      totalProfit,
      totalOrders,
      averageAcos,
      averageRoas,
      campaignCount: filteredCampaigns.length
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
      conversionRate
    });
  };

  const loading = campaignsLoading || keywordsLoading;

  return {
    metrics,
    loading,
    hasData: campaigns.length > 0 || keywords.length > 0
  };
};
