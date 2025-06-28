
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklyMetrics {
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

export const useWeeklyMetrics = (
  selectedCountry: string = 'all',
  selectedCampaign: string = 'all',
  selectedProduct: string = 'all'
) => {
  const { user } = useAuth();
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
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
      console.log('User ID:', user?.id);
      console.log('Filters:', { selectedCountry, selectedCampaign, selectedProduct });

      // Get date range for last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      console.log('Date range:', {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });

      // Get user's connections
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw connectionsError;
      }

      if (!connections || connections.length === 0) {
        console.log('No connections found for user');
        setWeeklyMetrics(null);
        setHasRealData(false);
        setLoading(false);
        return;
      }

      // Build query for weekly metrics
      let query = supabase
        .from('campaign_metrics_history')
        .select(`
          *,
          campaigns!inner(id, name, connection_id, data_source)
        `)
        .in('campaigns.connection_id', connections.map(c => c.id))
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Apply filters
      if (selectedCampaign !== 'all') {
        query = query.eq('campaigns.id', selectedCampaign);
      }

      const { data: metricsData, error: metricsError } = await query;

      if (metricsError) {
        console.error('Error fetching weekly metrics:', metricsError);
        throw metricsError;
      }

      console.log('Weekly metrics data:', metricsData?.length || 0, 'records found');

      if (!metricsData || metricsData.length === 0) {
        console.log('No weekly metrics data found');
        setWeeklyMetrics(null);
        setHasRealData(false);
        setLoading(false);
        return;
      }

      // Check if we have real API data
      const realDataRecords = metricsData.filter(record => record.data_source === 'api');
      const hasRealApiData = realDataRecords.length > 0;
      
      console.log('Weekly data analysis:', {
        total: metricsData.length,
        realData: realDataRecords.length,
        hasRealApiData
      });

      // Calculate aggregated metrics
      const totals = metricsData.reduce(
        (acc, record) => ({
          sales: acc.sales + (record.sales || 0),
          spend: acc.spend + (record.spend || 0),
          orders: acc.orders + (record.orders || 0),
          impressions: acc.impressions + (record.impressions || 0),
          clicks: acc.clicks + (record.clicks || 0),
          validAcos: record.acos ? [...acc.validAcos, record.acos] : acc.validAcos,
          validRoas: record.roas ? [...acc.validRoas, record.roas] : acc.validRoas,
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

      const calculatedMetrics: WeeklyMetrics = {
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

      console.log('Calculated weekly metrics:', calculatedMetrics);

      setWeeklyMetrics(calculatedMetrics);
      setHasRealData(hasRealApiData);
      
    } catch (error) {
      console.error('Error fetching weekly metrics:', error);
      setWeeklyMetrics(null);
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    weeklyMetrics,
    loading,
    hasRealData,
    refreshWeeklyMetrics: fetchWeeklyMetrics
  };
};
