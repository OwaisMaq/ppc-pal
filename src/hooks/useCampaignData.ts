
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  connection_id: string;
  amazon_campaign_id: string;
  name: string;
  campaign_type?: string;
  targeting_type?: string;
  status: 'enabled' | 'paused' | 'archived';
  budget?: number;
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
  data_source?: string;
  last_updated?: string;
  created_at: string;
}

export interface CampaignConnection {
  id: string;
  profile_id: string;
  profile_name?: string;
  marketplace_id?: string;
  status: string;
  last_sync_at?: string;
  campaigns: Campaign[];
}

export const useCampaignData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaignData', user?.id],
    queryFn: async (): Promise<CampaignConnection[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('=== Fetching Campaign Data ===');
      console.log('User ID:', user.id);

      try {
        // First, fetch Amazon connections with their campaigns
        const { data: connections, error: connectionsError } = await supabase
          .from('amazon_connections')
          .select(`
            id,
            profile_id,
            profile_name,
            marketplace_id,
            status,
            last_sync_at,
            campaigns!campaigns_connection_id_fkey (
              id,
              connection_id,
              amazon_campaign_id,
              name,
              campaign_type,
              targeting_type,
              status,
              budget,
              daily_budget,
              start_date,
              end_date,
              impressions,
              clicks,
              spend,
              sales,
              orders,
              acos,
              roas,
              data_source,
              last_updated,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (connectionsError) {
          console.error('Error fetching connections:', connectionsError);
          toast.error('Failed to load campaign data');
          throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
        }

        if (!connections || connections.length === 0) {
          console.log('No Amazon connections found');
          return [];
        }

        console.log(`Found ${connections.length} connections`);
        
        // Transform the data to match our interface
        const transformedConnections: CampaignConnection[] = connections.map(conn => {
          const campaigns = Array.isArray(conn.campaigns) ? conn.campaigns : [];
          
          console.log(`Connection ${conn.id}: ${campaigns.length} campaigns`);
          
          return {
            id: conn.id,
            profile_id: conn.profile_id,
            profile_name: conn.profile_name,
            marketplace_id: conn.marketplace_id,
            status: conn.status,
            last_sync_at: conn.last_sync_at,
            campaigns: campaigns.map((campaign: any) => ({
              id: campaign.id,
              connection_id: campaign.connection_id,
              amazon_campaign_id: campaign.amazon_campaign_id,
              name: campaign.name,
              campaign_type: campaign.campaign_type,
              targeting_type: campaign.targeting_type,
              status: campaign.status,
              budget: campaign.budget,
              daily_budget: campaign.daily_budget,
              start_date: campaign.start_date,
              end_date: campaign.end_date,
              impressions: campaign.impressions || 0,
              clicks: campaign.clicks || 0,
              spend: campaign.spend || 0,
              sales: campaign.sales || 0,
              orders: campaign.orders || 0,
              acos: campaign.acos,
              roas: campaign.roas,
              data_source: campaign.data_source,
              last_updated: campaign.last_updated,
              created_at: campaign.created_at,
            }))
          };
        });

        console.log('=== Campaign Data Loaded Successfully ===');
        console.log('Connections with campaigns:', transformedConnections.length);
        
        const totalCampaigns = transformedConnections.reduce((sum, conn) => sum + conn.campaigns.length, 0);
        console.log('Total campaigns:', totalCampaigns);

        return transformedConnections;

      } catch (queryError) {
        console.error('Query execution failed:', queryError);
        
        // Show user-friendly error message
        if (queryError.message?.includes('foreign key')) {
          toast.error('Database schema issue detected. Please contact support.');
        } else if (queryError.message?.includes('authentication')) {
          toast.error('Please log in again to access your data.');
        } else {
          toast.error('Failed to load campaign data. Please try again.');
        }
        
        throw queryError;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Helper hook to get all campaigns across all connections
export const useAllCampaigns = () => {
  const { data: connections, ...queryResult } = useCampaignData();
  
  const allCampaigns = connections?.reduce<Campaign[]>((acc, connection) => {
    return [...acc, ...connection.campaigns];
  }, []) || [];

  return {
    ...queryResult,
    data: allCampaigns,
    connections
  };
};

// Helper hook to get campaigns by connection
export const useCampaignsByConnection = (connectionId?: string) => {
  const { data: connections, ...queryResult } = useCampaignData();
  
  const connectionCampaigns = connectionId 
    ? connections?.find(conn => conn.id === connectionId)?.campaigns || []
    : [];

  return {
    ...queryResult,
    data: connectionCampaigns
  };
};
