
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PerformanceMetrics } from '@/types/performance';
import { filterRealDataOnly } from '@/utils/dataFilter';

export const useWeeklyMetrics = (
  selectedCountry?: string,
  selectedCampaign?: string,
  selectedProduct?: string
) => {
  const { user } = useAuth();
  const [weeklyMetrics, setWeeklyMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchWeeklyMetrics();
  }, [user, selectedCountry, selectedCampaign, selectedProduct]);

  const fetchWeeklyMetrics = async () => {
    try {
      setLoading(true);
      
      console.log('=== FETCHING WEEKLY METRICS ===');
      console.log('User ID:', user.id);
      console.log('Filters:', {
        selectedCountry,
        selectedCampaign,
        selectedProduct
      });

      // Calculate date range for last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log('Date range:', { start: startDateStr, end: endDateStr });

      // Get user connections first
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('id, profile_id, marketplace_id')
        .eq('user_id', user.id);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw connectionsError;
      }

      if (!connections?.length) {
        console.log('No connections found');
        setWeeklyMetrics(null);
        setHasRealData(false);
        return;
      }

      const connectionIds = connections.map(c => c.id);
      console.log('Connection IDs:', connectionIds);

      // FIXED: Use explicit join to resolve relationship ambiguity
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics_history')
        .select(`
          *,
          campaigns!campaign_metrics_history_campaign_id_fkey (
            id,
            name,
            amazon_campaign_id,
            connection_id,
            data_source
          )
        `)
        .in('campaigns.connection_id', connectionIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (metricsError) {
        console.error('Error fetching weekly metrics:', metricsError);
        
        // Fallback: Get recent campaign data instead
        console.log('Falling back to recent campaign data...');
        return await fetchRecentCampaignData(connectionIds);
      }

      console.log('Weekly metrics data retrieved:', metricsData?.length || 0, 'records');

      if (!metricsData?.length) {
        console.log('No weekly metrics found, trying recent campaign data...');
        return await fetchRecentCampaignData(connectionIds);
      }

      // Process the weekly metrics data
      const processedMetrics = processWeeklyData(metricsData, connections, selectedCountry, selectedCampaign, selectedProduct);
      
      setWeeklyMetrics(processedMetrics);
      setHasRealData(processedMetrics !== null);
      
    } catch (error) {
      console.error('Error fetching weekly metrics:', error);
      setWeeklyMetrics(null);
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCampaignData = async (connectionIds: string[]) => {
    try {
      console.log('Fetching recent campaign data as fallback...');
      
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('connection_id', connectionIds)
        .order('last_updated', { ascending: false });

      if (error) {
        console.error('Error fetching recent campaigns:', error);
        setWeeklyMetrics(null);
        setHasRealData(false);
        return;
      }

      console.log('Recent campaigns retrieved:', campaigns?.length || 0);

      if (!campaigns?.length) {
        setWeeklyMetrics(null);
        setHasRealData(false);
        return;
      }

      // Filter for real API data only
      const realCampaigns = filterRealDataOnly(campaigns);
      console.log('Real API campaigns from recent data:', realCampaigns.length);

      if (realCampaigns.length === 0) {
        setWeeklyMetrics(null);
        setHasRealData(false);
        return;
      }

      // Calculate aggregated metrics from recent campaigns
      const aggregatedMetrics = calculateAggregatedMetrics(realCampaigns);
      
      setWeeklyMetrics(aggregatedMetrics);
      setHasRealData(aggregatedMetrics !== null);
      
    } catch (error) {
      console.error('Error in fallback data fetch:', error);
      setWeeklyMetrics(null);
      setHasRealData(false);
    }
  };

  return {
    weeklyMetrics,
    loading,
    hasRealData
  };
};

function processWeeklyData(
  metricsData: any[],
  connections: any[],
  selectedCountry?: string,
  selectedCampaign?: string,
  selectedProduct?: string
): PerformanceMetrics | null {
  
  // Filter for real API data only
  const realMetricsData = metricsData.filter(record => 
    record.campaigns?.data_source === 'api'
  );

  if (realMetricsData.length === 0) {
    console.log('No real API data in weekly metrics');
    return null;
  }

  // Apply filters
  let filteredData = realMetricsData;

  if (selectedCountry && selectedCountry !== 'all') {
    const countryConnections = connections
      .filter(conn => conn.marketplace_id === selectedCountry)
      .map(conn => conn.id);
    filteredData = filteredData.filter(record => 
      countryConnections.includes(record.campaigns?.connection_id)
    );
  }

  if (selectedCampaign && selectedCampaign !== 'all') {
    filteredData = filteredData.filter(record => 
      record.campaigns?.id === selectedCampaign
    );
  }

  if (selectedProduct && selectedProduct !== 'all') {
    filteredData = filteredData.filter(record => {
      const campaignName = record.campaigns?.name || '';
      const amazonId = record.campaigns?.amazon_campaign_id || '';
      return campaignName.toLowerCase().includes(selectedProduct.toLowerCase()) ||
             amazonId.toLowerCase().includes(selectedProduct.toLowerCase());
    });
  }

  if (filteredData.length === 0) {
    return null;
  }

  // Aggregate the metrics
  const totals = filteredData.reduce((acc, record) => ({
    sales: acc.sales + (record.sales || 0),
    spend: acc.spend + (record.spend || 0),
    orders: acc.orders + (record.orders || 0),
    impressions: acc.impressions + (record.impressions || 0),
    clicks: acc.clicks + (record.clicks || 0)
  }), { sales: 0, spend: 0, orders: 0, impressions: 0, clicks: 0 });

  return {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalOrders: totals.orders,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    averageAcos: totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0,
    averageRoas: totals.spend > 0 ? totals.sales / totals.spend : 0,
    clickThroughRate: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    conversionRate: totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0
  };
}

function calculateAggregatedMetrics(campaigns: any[]): PerformanceMetrics | null {
  if (campaigns.length === 0) return null;

  const totals = campaigns.reduce((acc, campaign) => ({
    sales: acc.sales + (campaign.sales || 0),
    spend: acc.spend + (campaign.spend || 0),
    orders: acc.orders + (campaign.orders || 0),
    impressions: acc.impressions + (campaign.impressions || 0),
    clicks: acc.clicks + (campaign.clicks || 0)
  }), { sales: 0, spend: 0, orders: 0, impressions: 0, clicks: 0 });

  return {
    totalSales: totals.sales,
    totalSpend: totals.spend,
    totalOrders: totals.orders,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    averageAcos: totals.sales > 0 ? (totals.spend / totals.sales) * 100 : 0,
    averageRoas: totals.spend > 0 ? totals.sales / totals.spend : 0,
    clickThroughRate: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    conversionRate: totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0
  };
}
