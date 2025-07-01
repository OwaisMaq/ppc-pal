
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

  // Since Amazon functionality has been removed, return empty data
  const dataQuality: DataQuality = useMemo(() => ({
    hasRealData: false,
    realDataCampaigns: 0,
    totalCampaigns: 0,
    simulatedCampaigns: 0,
    dataSourceBreakdown: {},
    apiDataQuality: 'none',
    syncIssues: ['Amazon functionality has been removed']
  }), []);

  const metrics: PerformanceMetrics | null = useMemo(() => null, []);

  const recommendations = useMemo(() => [
    'Amazon functionality has been removed - no performance data available'
  ], []);

  const hasData = false;
  const hasRealData = false;

  const getFilteredDescription = () => '';

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
    campaigns: [],
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
