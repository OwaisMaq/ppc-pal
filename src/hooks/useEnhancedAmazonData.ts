import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Campaign, AdGroup, Keyword } from '@/lib/amazon/types';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface AttributionWindow {
  window: '7d' | '14d';
  label: string;
}

interface PerformanceHistoryEntry {
  id: string;
  date: string;
  attribution_window: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  conversion_rate: number | null;
}

export const useEnhancedAmazonData = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAttributionWindow, setSelectedAttributionWindow] = useState<'7d' | '14d'>('14d');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const attributionWindows: AttributionWindow[] = [
    { window: '7d', label: '7 Day Attribution' },
    { window: '14d', label: '14 Day Attribution' }
  ];

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, selectedAttributionWindow]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCampaigns(),
        fetchAdGroups(),
        fetchKeywords()
      ]);
    } catch (error) {
      console.error('Error fetching Amazon data:', error);
      toast.error('Failed to load Amazon data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          amazon_connections!campaigns_connection_id_fkey(
            user_id,
            profile_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter campaigns for current user
      const userCampaigns = data?.filter(campaign => 
        campaign.amazon_connections?.user_id === user?.id
      ) || [];

      setCampaigns(userCampaigns);
      console.log('Fetched campaigns:', userCampaigns.length);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  };

  const fetchAdGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_groups')
        .select(`
          *,
          campaigns!ad_groups_campaign_id_fkey(
            amazon_connections!campaigns_connection_id_fkey(
              user_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter ad groups for current user
      const userAdGroups = data?.filter(adGroup => 
        adGroup.campaigns?.amazon_connections?.user_id === user?.id
      ) || [];

      setAdGroups(userAdGroups);
      console.log('Fetched ad groups:', userAdGroups.length);
    } catch (error) {
      console.error('Error fetching ad groups:', error);
      throw error;
    }
  };

  const fetchKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select(`
          *,
          ad_groups!keywords_adgroup_id_fkey(
            campaigns!ad_groups_campaign_id_fkey(
              amazon_connections!campaigns_connection_id_fkey(
                user_id
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter keywords for current user
      const userKeywords = data?.filter(keyword => 
        keyword.ad_groups?.campaigns?.amazon_connections?.user_id === user?.id
      ) || [];

      setKeywords(userKeywords);
      console.log('Fetched keywords:', userKeywords.length);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      throw error;
    }
  };

  const syncWithEnhancedOptions = async (
    connectionId: string, 
    options?: {
      dateRange?: DateRange;
      attributionWindows?: string[];
      reportTypes?: string[];
      campaignTypes?: string[];
    }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-report-generation', {
        body: { 
          connectionId,
          dateRange: options?.dateRange || dateRange,
          attributionWindows: options?.attributionWindows || ['7d', '14d'],
          reportTypes: options?.reportTypes || ['spCampaigns'],
          campaignIdFilter: options?.campaignTypes || []
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Enhanced report generation error:', error);
        toast.error(`Failed to generate Amazon reports: ${error.message || 'Unknown error'}`);
        
        // Log failed report generation attempt
        try {
          await supabase
            .from('sync_performance_logs')
            .insert({
              connection_id: connectionId,
              operation_type: 'enhanced_report_generation',
              start_time: new Date().toISOString(),
              success: false,
              error_message: error.message || 'Unknown error'
            });
        } catch (logError) {
          console.warn('Failed to log error:', logError);
        }
        
        return false;
      }
      
      console.log('Enhanced report generation response:', data);
      
      // Log performance metrics for monitoring
      if (data?.performance) {
        console.log('Report generation performance metrics:', data.performance);
        
        // Store performance data for analytics
        try {
          await supabase
            .from('sync_performance_logs')
            .insert({
              connection_id: connectionId,
              operation_type: 'enhanced_report_generation',
              start_time: new Date().toISOString(),
              end_time: new Date().toISOString(),
              total_duration_ms: data.performance.totalTime,
              phases: { report_generation: data.performance.totalTime },
              campaigns_processed: data.performance?.reportsGenerated || 0,
              success: true,
              performance_metrics: data.performance
            });
        } catch (logError) {
          console.warn('Failed to log performance data:', logError);
        }
      }

      // Show detailed success message with report generation stats
      const reportsGenerated = data?.performance?.reportsGenerated || 0;
      const reportsFailed = data?.performance?.reportsFailed || 0;
      
      let message = 'Enhanced report generation completed successfully!';
      
      if (reportsGenerated > 0) {
        message = `Successfully generated ${reportsGenerated} reports${reportsFailed > 0 ? ` (${reportsFailed} failed)` : ''}`;
      }
      
      toast.success(message);
      
      // Show detailed results
      if (data?.results?.length > 0) {
        const completedReports = data.results.filter((r: any) => r.status === 'completed');
        if (completedReports.length > 0) {
          toast.info(`Report generation completed for ${completedReports.map((r: any) => r.reportType).join(', ')}`);
        }
      }
      
      // Refresh data after processing with optimized timing
      setTimeout(() => {
        fetchAllData();
        toast.info('Data refreshed with enhanced report generation results');
      }, 2000);
      
      return true;
      
    } catch (error) {
      console.error('Error syncing data:', error);
      const errorMessage = error?.message || 'Network or server error';
      toast.error(`Sync failed: ${errorMessage}`);
      
      // Log failed sync attempt
      try {
        await supabase
          .from('sync_performance_logs')
          .insert({
            connection_id: connectionId,
            operation_type: 'enhanced_sync',
            start_time: new Date().toISOString(),
            success: false,
            error_message: errorMessage
          });
      } catch (logError) {
        console.warn('Failed to log error:', logError);
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceHistory = async (campaignId: string): Promise<PerformanceHistoryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('campaign_performance_history')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching performance history:', error);
      return [];
    }
  };

  const getEnhancedDataSummary = () => {
    // Get metrics based on selected attribution window
    const getMetric = (campaign: Campaign, baseMetric: string) => {
      if (selectedAttributionWindow === '7d') {
        return campaign[`${baseMetric}_7d` as keyof Campaign] || campaign[baseMetric as keyof Campaign] || 0;
      }
      return campaign[`${baseMetric}_14d` as keyof Campaign] || campaign[baseMetric as keyof Campaign] || 0;
    };

    const totalSpend = campaigns.reduce((sum, campaign) => sum + Number(getMetric(campaign, 'spend')), 0);
    const totalSales = campaigns.reduce((sum, campaign) => sum + Number(getMetric(campaign, 'sales')), 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + Number(getMetric(campaign, 'clicks')), 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + Number(getMetric(campaign, 'impressions')), 0);
    const totalOrders = campaigns.reduce((sum, campaign) => sum + Number(getMetric(campaign, 'orders')), 0);
    
    const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const avgRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgConversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    return {
      totalCampaigns: campaigns.length,
      totalAdGroups: adGroups.length,
      totalKeywords: keywords.length,
      totalSpend,
      totalSales,
      totalClicks,
      totalImpressions,
      totalOrders,
      avgAcos,
      avgRoas,
      avgCtr,
      avgCpc,
      avgConversionRate,
      attributionWindow: selectedAttributionWindow
    };
  };

  return {
    campaigns,
    adGroups,
    keywords,
    loading,
    selectedAttributionWindow,
    setSelectedAttributionWindow,
    attributionWindows,
    dateRange,
    setDateRange,
    fetchAllData,
    syncWithEnhancedOptions,
    fetchPerformanceHistory,
    dataSummary: getEnhancedDataSummary()
  };
};