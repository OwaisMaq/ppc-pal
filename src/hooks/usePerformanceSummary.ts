
import { useState, useEffect, useMemo } from 'react';
import { useCampaignData } from './useCampaignData';
import { useAmazonConnections } from './useAmazonConnections';

interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  averageAcos: number;
  averageRoas: number;
  clickThroughRate: number;
  conversionRate: number;
}

interface DataQuality {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
  apiDataQuality: 'excellent' | 'good' | 'poor' | 'none';
  lastRealDataUpdate?: string;
  syncIssues?: string[];
}

export const usePerformanceSummary = () => {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  
  const { connections } = useAmazonConnections();
  const { campaigns, loading } = useCampaignData();

  console.log('=== PERFORMANCE SUMMARY HOOK DEBUG ===');
  console.log('Connections:', connections.length);
  console.log('Campaigns:', campaigns.length);
  console.log('Loading state:', loading);

  // Enhanced data quality analysis
  const dataQuality: DataQuality = useMemo(() => {
    const realDataCampaigns = campaigns.filter(c => c.data_source === 'api');
    const simulatedCampaigns = campaigns.filter(c => c.data_source === 'simulated' || !c.data_source);
    
    const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
      const source = campaign.data_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Determine API data quality
    let apiDataQuality: 'excellent' | 'good' | 'poor' | 'none' = 'none';
    const realDataPercentage = campaigns.length > 0 ? (realDataCampaigns.length / campaigns.length) * 100 : 0;
    
    if (realDataPercentage >= 80) {
      apiDataQuality = 'excellent';
    } else if (realDataPercentage >= 50) {
      apiDataQuality = 'good';
    } else if (realDataPercentage > 0) {
      apiDataQuality = 'poor';
    }

    // Find most recent real data update
    const lastRealDataUpdate = realDataCampaigns
      .filter(c => c.last_updated)
      .sort((a, b) => new Date(b.last_updated!).getTime() - new Date(a.last_updated!).getTime())[0]?.last_updated;

    // Identify sync issues
    const syncIssues: string[] = [];
    if (connections.length > 0 && campaigns.length === 0) {
      syncIssues.push('Amazon connection exists but no campaigns found');
    }
    if (realDataCampaigns.length === 0 && campaigns.length > 0) {
      syncIssues.push('All campaigns are using simulated data - API sync may have failed');
    }
    if (connections.some(c => c.status === 'error')) {
      syncIssues.push('One or more Amazon connections have errors');
    }

    console.log('📊 Data Quality Analysis:', {
      realDataCampaigns: realDataCampaigns.length,
      totalCampaigns: campaigns.length,
      apiDataQuality,
      dataSourceBreakdown,
      syncIssues
    });

    return {
      hasRealData: realDataCampaigns.length > 0,
      realDataCampaigns: realDataCampaigns.length,
      totalCampaigns: campaigns.length,
      simulatedCampaigns: simulatedCampaigns.length,
      dataSourceBreakdown,
      apiDataQuality,
      lastRealDataUpdate,
      syncIssues
    };
  }, [campaigns, connections]);

  // Performance metrics calculation
  const metrics: PerformanceMetrics | null = useMemo(() => {
    if (!campaigns.length) return null;

    // Filter campaigns based on selection
    let filteredCampaigns = campaigns;
    
    if (selectedCountry !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => {
        // Use connection marketplace or campaign metadata for country filtering
        return true; // Placeholder - implement country filtering based on your data structure
      });
    }

    if (selectedCampaign !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.id === selectedCampaign);
    }

    console.log('📈 Calculating metrics for', filteredCampaigns.length, 'filtered campaigns');

    const totals = filteredCampaigns.reduce(
      (acc, campaign) => ({
        sales: acc.sales + (campaign.sales || 0),
        spend: acc.spend + (campaign.spend || 0),
        orders: acc.orders + (campaign.orders || 0),
        impressions: acc.impressions + (campaign.impressions || 0),
        clicks: acc.clicks + (campaign.clicks || 0),
        validAcos: campaign.acos ? [...acc.validAcos, campaign.acos] : acc.validAcos,
        validRoas: campaign.roas ? [...acc.validRoas, campaign.roas] : acc.validRoas,
      }),
      { 
        sales: 0, 
        spend: 0, 
        orders: 0, 
        impressions: 0, 
        clicks: 0, 
        validAcos: [] as number[], 
        validRoas: [] as number[] 
      }
    );

    const averageAcos = totals.validAcos.length > 0 
      ? totals.validAcos.reduce((a, b) => a + b, 0) / totals.validAcos.length 
      : 0;

    const averageRoas = totals.validRoas.length > 0 
      ? totals.validRoas.reduce((a, b) => a + b, 0) / totals.validRoas.length 
      : 0;

    const clickThroughRate = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;

    const calculatedMetrics = {
      totalSales: totals.sales,
      totalSpend: totals.spend,
      totalOrders: totals.orders,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      averageAcos,
      averageRoas,
      clickThroughRate,
      conversionRate,
    };

    console.log('📊 Final calculated metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, [campaigns, selectedCountry, selectedCampaign]);

  // Enhanced recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (dataQuality.apiDataQuality === 'none') {
      recs.push('Connect your Amazon Advertising account to get real performance data');
      recs.push('Ensure your Amazon account has active advertising campaigns');
    } else if (dataQuality.apiDataQuality === 'poor') {
      recs.push('Re-sync your Amazon connection to improve data quality');
      recs.push('Check if all your advertising profiles are properly connected');
    } else if (dataQuality.syncIssues && dataQuality.syncIssues.length > 0) {
      recs.push('Review and resolve sync issues in your Amazon connections');
    }

    if (connections.length === 0) {
      recs.push('Add your first Amazon Advertising connection to get started');
    }

    return recs;
  }, [dataQuality, connections.length]);

  const hasData = campaigns.length > 0;
  const hasRealData = dataQuality.hasRealData;

  const getFilteredDescription = () => {
    const parts = [];
    if (selectedCountry !== 'all') parts.push(`in ${selectedCountry}`);
    if (selectedCampaign !== 'all') {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (campaign) parts.push(`for campaign "${campaign.name}"`);
    }
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return {
    selectedCountry,
    setSelectedCountry,
    selectedCampaign,
    setSelectedCampaign,
    connections,
    campaigns,
    metrics,
    loading,
    hasData,
    hasRealData,
    dataQuality,
    recommendations,
    getFilteredDescription,
    formatCurrency,
    formatPercentage,
  };
};
