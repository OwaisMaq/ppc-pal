
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

      console.log('=== FETCHING CAMPAIGNS DEBUG (ENHANCED) ===');
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

      console.log('=== CAMPAIGN DATA FETCH RESULTS (ENHANCED) ===');
      console.log(`Total campaigns fetched: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('=== DETAILED CAMPAIGN ANALYSIS ===');
        
        // Analyze campaigns by data source
        const byDataSource = data.reduce((acc, campaign) => {
          const source = campaign.data_source || 'undefined';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Campaigns by data source:', byDataSource);
        
        // Analyze campaigns by status
        const byStatus = data.reduce((acc, campaign) => {
          acc[campaign.status] = (acc[campaign.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Campaigns by status:', byStatus);
        
        // Check for campaigns with any performance data
        const withPerformanceData = data.filter(c => 
          (c.sales || 0) > 0 || 
          (c.spend || 0) > 0 || 
          (c.orders || 0) > 0 ||
          (c.clicks || 0) > 0 ||
          (c.impressions || 0) > 0
        );
        
        console.log(`Campaigns with performance data: ${withPerformanceData.length}`);
        
        // Sample campaign details
        console.log('Sample campaign details:');
        data.slice(0, 3).forEach((campaign, index) => {
          console.log(`Campaign ${index + 1}:`, {
            name: campaign.name,
            amazon_campaign_id: campaign.amazon_campaign_id,
            data_source: campaign.data_source,
            status: campaign.status,
            sales: campaign.sales,
            spend: campaign.spend,
            orders: campaign.orders,
            clicks: campaign.clicks,
            impressions: campaign.impressions,
            connection_id: campaign.connection_id,
            created_at: campaign.created_at
          });
        });
        
        // Check if we have any API campaigns at all
        const apiCampaigns = data.filter(c => c.data_source === 'api');
        console.log(`✅ API Campaigns found: ${apiCampaigns.length}`);
        
        if (apiCampaigns.length > 0) {
          console.log('🎉 SUCCESS: Real Amazon API campaigns are available!');
          console.log('Sample API campaign:', {
            name: apiCampaigns[0].name,
            amazon_campaign_id: apiCampaigns[0].amazon_campaign_id,
            status: apiCampaigns[0].status
          });
        } else {
          console.log('⚠️ WARNING: No campaigns marked as API source found');
          console.log('This might indicate a sync issue or data marking problem');
        }
        
      } else {
        console.log('❌ No campaigns found in database');
        console.log('This indicates either:');
        console.log('1. No campaigns exist in Amazon account');
        console.log('2. Sync has not been run');
        console.log('3. Sync failed to store campaigns');
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
