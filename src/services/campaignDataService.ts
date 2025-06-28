
import { supabase } from '@/integrations/supabase/client';

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
  data_source?: string;
  last_updated?: string;
}

export const campaignDataService = {
  async fetchUserConnections(userId: string) {
    const { data, error } = await supabase
      .from('amazon_connections')
      .select('id, profile_id, status, last_sync_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }

    return data || [];
  },

  async fetchCampaigns(connectionIds: string[], specificConnectionId?: string) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .in('connection_id', connectionIds);

    if (specificConnectionId) {
      query = query.eq('connection_id', specificConnectionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }

    return data || [];
  }
};
