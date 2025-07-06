
import { useState, useEffect, useMemo } from 'react';
import { useCampaignData } from './useCampaignData';
import { useAmazonConnections } from './useAmazonConnections';
import { calculateMetrics } from '@/utils/metricsCalculator';

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

  console.log('=== Performance Summary Debug ===');
  console.log('Campaigns loaded:', campaigns.length);
  console.log('Connections:', connections.length);
  console.log('Loading state:', loading);

  // Calculate data quality
  const dataQuality: DataQuality = useMemo(() => {
    const realDataCampaigns = campaigns.filter(c => 
      c.data_source === 'amazon_api' && 
      (c.sales > 0 || c.spend > 0 || c.orders > 0)
    ).length;

    const simulatedCampaigns = campaigns.length - realDataCampaigns;
    const hasRealData = realDataCampaigns > 0;

    const syncIssues = [];
    const setupRequiredConnections = connections.filter(c => c.status === 'setup_required');
    if (setupRequiredConnections.length > 0) {
      syncIssues.push(`${setupRequiredConnections.length} connection(s) need syncing`);
    }

    return {
      hasRealData,
      realDataCampaigns,
      totalCampaigns: campaigns.length,
      simulatedCampaigns,
      dataSourceBreakdown: {
        'amazon_api': realDataCampaigns,
        'simulated': simulatedCampaigns
      },
      apiDataQuality: hasRealData ? 'good' : campaigns.length > 0 ? 'poor' : 'none',
      syncIssues: syncIssues.length > 0 ? syncIssues : undefined
    };
  }, [campaigns, connections]);

  // Calculate metrics using the metrics calculator
  const metrics: PerformanceMetrics | null = useMemo(() => {
    console.log('=== Calculating Metrics ===');
    console.log('Input campaigns:', campaigns.length);
    
    if (campaigns.length === 0) {
      console.log('No campaigns available for metrics calculation');
      return null;
    }

    const calculatedMetrics = calculateMetrics(campaigns);
    console.log('Calculated metrics:', calculatedMetrics);
    
    return calculatedMetrics;
  }, [campaigns]);

  const recommendations = useMemo(() => {
    const recs = [];
    
    if (campaigns.length === 0) {
      recs.push('Connect and sync your Amazon account to view campaign data');
    } else if (!dataQuality.hasRealData) {
      recs.push('Sync your campaigns to get real performance data from Amazon');
    } else {
      recs.push('Performance data is available and up to date');
      
      if (metrics && metrics.averageAcos > 30) {
        recs.push('Consider optimizing campaigns with high ACOS (>30%)');
      }
      
      if (metrics && metrics.averageRoas < 2) {
        recs.push('Focus on improving ROAS for better profitability');
      }
    }

    return recs;
  }, [campaigns, dataQuality, metrics]);

  const hasData = campaigns.length > 0;
  const hasRealData = dataQuality.hasRealData;

  const getFilteredDescription = () => {
    let desc = '';
    if (selectedCountry !== 'all') desc += ` for ${selectedCountry}`;
    if (selectedCampaign !== 'all') desc += ` (${selectedCampaign} campaign)`;
    return desc;
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
