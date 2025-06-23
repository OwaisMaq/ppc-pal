
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CampaignData {
  id: string;
  name: string;
  amazon_campaign_id: string;
  campaign_type?: string;
  targeting_type?: string;
  status: 'enabled' | 'paused' | 'archived';
  daily_budget?: number;
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  connection_id: string;
  // Historical tracking fields
  previous_month_sales?: number;
  previous_month_spend?: number;
  previous_month_orders?: number;
  data_source?: string;
  metrics_last_calculated?: string;
}

export const useCampaignData = (connectionId?: string) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchCampaigns();
  }, [user, connectionId]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== FETCHING CAMPAIGNS DEBUG ===');
      console.log('User ID:', user.id);
      console.log('Connection ID filter:', connectionId);

      // Get user's connections first
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('id, profile_id, status, last_sync_at')
        .eq('user_id', user.id);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw connectionsError;
      }

      console.log('User connections found:', connections?.length || 0);
      if (connections && connections.length > 0) {
        connections.forEach(conn => {
          console.log(`Connection ${conn.id}: Profile ${conn.profile_id}, Status: ${conn.status}, Last sync: ${conn.last_sync_at}`);
        });
      }

      if (!connections || connections.length === 0) {
        console.log('No Amazon connections found for user');
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Build query to fetch campaigns with all necessary fields
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          previous_month_sales,
          previous_month_spend,
          previous_month_orders,
          data_source,
          metrics_last_calculated
        `)
        .in('connection_id', connections.map(c => c.id));

      // Filter by specific connection if provided
      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }

      console.log('=== CAMPAIGN DATA FETCH RESULTS ===');
      console.log(`Total campaigns fetched: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('Sample campaign data:');
        data.slice(0, 3).forEach((campaign, index) => {
          console.log(`Campaign ${index + 1}:`, {
            id: campaign.id,
            name: campaign.name,
            amazon_campaign_id: campaign.amazon_campaign_id,
            data_source: campaign.data_source,
            sales: campaign.sales,
            spend: campaign.spend,
            orders: campaign.orders,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            status: campaign.status,
            connection_id: campaign.connection_id
          });
        });
        
        const realDataCampaigns = data.filter(c => c.data_source === 'api');
        const simulatedCampaigns = data.filter(c => c.data_source !== 'api');
        
        console.log(`Real API campaigns: ${realDataCampaigns.length}`);
        console.log(`Non-API campaigns: ${simulatedCampaigns.length}`);
        
        // Show data source breakdown
        const dataSourceBreakdown = data.reduce((acc, campaign) => {
          const source = campaign.data_source || 'undefined';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Data source breakdown:', dataSourceBreakdown);
        
        // Check for campaigns with performance metrics
        const campaignsWithMetrics = data.filter(c => 
          (c.sales || 0) > 0 || 
          (c.spend || 0) > 0 || 
          (c.orders || 0) > 0 ||
          (c.clicks || 0) > 0 ||
          (c.impressions || 0) > 0
        );
        console.log(`Campaigns with performance metrics: ${campaignsWithMetrics.length}`);
      } else {
        console.log('No campaigns found in database');
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch campaigns');
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshCampaigns = () => {
    fetchCampaigns();
  };

  return {
    campaigns,
    loading,
    error,
    refreshCampaigns
  };
};
