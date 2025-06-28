
import { useState, useEffect, useMemo } from 'react';
import { useCampaignData } from './useCampaignData';
import { useAmazonConnections } from './useAmazonConnections';
import { filterRealDataOnly } from '@/utils/dataFilter';

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

  console.log('=== STRICT PERFORMANCE SUMMARY - NO SIMULATION DATA ===');
  console.log('Connections:', connections.length);
  console.log('Total campaigns:', campaigns.length);
  console.log('Loading state:', loading);

  // STRICT: Only work with real API data
  const realApiCampaigns = useMemo(() => {
    const filtered = filterRealDataOnly(campaigns);
    console.log('Real API campaigns after strict filtering:', filtered.length);
    return filtered;
  }, [campaigns]);

  // Enhanced data quality analysis - STRICT mode
  const dataQuality: DataQuality = useMemo(() => {
    const simulatedCampaigns = campaigns.filter(c => c.data_source !== 'api');
    
    const dataSourceBreakdown = campaigns.reduce((acc, campaign) => {
      const source = campaign.data_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Determine API data quality - STRICT
    let apiDataQuality: 'excellent' | 'good' | 'poor' | 'none' = 'none';
    if (realApiCampaigns.length > 0) {
      const realDataPercentage = campaigns.length > 0 ? (realApiCampaigns.length / campaigns.length) * 100 : 0;
      if (realDataPercentage >= 80) {
        apiDataQuality = 'excellent';
      } else if (realDataPercentage >= 50) {
        apiDataQuality = 'good';
      } else {
        apiDataQuality = 'poor';
      }
    }

    // Find most recent real data update
    const lastRealDataUpdate = realApiCampaigns
      .filter(c => c.last_updated)
      .sort((a, b) => new Date(b.last_updated!).getTime() - new Date(a.last_updated!).getTime())[0]?.last_updated;

    // Identify sync issues
    const syncIssues: string[] = [];
    if (connections.length > 0 && campaigns.length === 0) {
      syncIssues.push('Amazon connection exists but no campaigns found');
    }
    if (realApiCampaigns.length === 0 && campaigns.length > 0) {
      syncIssues.push('All campaigns are using simulated data - API sync may have failed');
    }
    if (connections.some(c => c.status === 'error')) {
      syncIssues.push('One or more Amazon connections have errors');
    }

    console.log('📊 STRICT Data Quality Analysis:', {
      realDataCampaigns: realApiCampaigns.length,
      totalCampaigns: campaigns.length,
      apiDataQuality,
      dataSourceBreakdown,
      syncIssues
    });

    return {
      hasRealData: realApiCampaigns.length > 0,
      realDataCampaigns: realApiCampaigns.length,
      totalCampaigns: campaigns.length,
      simulatedCampaigns: simulatedCampaigns.length,
      dataSourceBreakdown,
      apiDataQuality,
      lastRealDataUpdate,
      syncIssues
    };
  }, [campaigns, connections, realApiCampaigns]);

  // Performance metrics calculation - ONLY from real API data
  const metrics: PerformanceMetrics | null = useMemo(() => {
    if (!realApiCampaigns.length) {
      console.log('❌ No real API campaigns - returning null metrics');
      return null;
    }

    // Filter campaigns based on selection - only real API campaigns
    let filteredCampaigns = realApiCampaigns;
    
    if (selectedCountry !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => {
        // Use connection marketplace or campaign metadata for country filtering
        return true; // Placeholder - implement country filtering based on your data structure
      });
    }

    if (selectedCampaign !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.id === selectedCampaign);
    }

    console.log('📈 Calculating metrics for', filteredCampaigns.length, 'real API campaigns only');

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

    console.log('📊 REAL API METRICS CALCULATED:', calculatedMetrics);
    return calculatedMetrics;
  }, [realApiCampaigns, selectedCountry, selectedCampaign]);

  // Enhanced recommendations - STRICT mode
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (dataQuality.apiDataQuality === 'none') {
      recs.push('No real Amazon API data available - please sync your Amazon connection');
      recs.push('Ensure your Amazon account has active advertising campaigns');
    } else if (dataQuality.apiDataQuality === 'poor') {
      recs.push('Limited real data available - re-sync your Amazon connection to improve data quality');
      recs.push('Check if all your advertising profiles are properly connected');
    } else if (dataQuality.syncIssues && dataQuality.syncIssues.length > 0) {
      recs.push('Review and resolve sync issues in your Amazon connections');
    }

    if (connections.length === 0) {
      recs.push('Add your first Amazon Advertising connection to get started');
    }

    return recs;
  }, [dataQuality, connections.length]);

  const hasData = realApiCampaigns.length > 0; // Only count real data
  const hasRealData = dataQuality.hasRealData;

  const getFilteredDescription = () => {
    const parts = [];
    if (selectedCountry !== 'all') parts.push(`in ${selectedCountry}`);
    if (selectedCampaign !== 'all') {
      const campaign = realApiCampaigns.find(c => c.id === selectedCampaign);
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
    campaigns: realApiCampaigns, // Only return real API campaigns
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
