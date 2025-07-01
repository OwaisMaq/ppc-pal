
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CampaignData {
  id: string;
  name: string;
  status: 'enabled' | 'paused' | 'archived';
  sales: number;
  spend: number;
  orders: number;
  impressions: number;
  clicks: number;
  acos?: number;
  roas?: number;
  connection_id: string;
  amazon_campaign_id: string;
  campaign_type?: string;
  data_source?: string;
  last_updated?: string;
  targeting_type?: string;
  daily_budget?: number;
  start_date?: string;
  end_date?: string;
}

export const useCampaignData = (connectionId?: string) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          amazon_connections!inner(user_id)
        `)
        .eq('amazon_connections.user_id', user.id);

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedCampaigns: CampaignData[] = (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sales: campaign.sales || 0,
        spend: campaign.spend || 0,
        orders: campaign.orders || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        acos: campaign.acos,
        roas: campaign.roas,
        connection_id: campaign.connection_id,
        amazon_campaign_id: campaign.amazon_campaign_id,
        campaign_type: campaign.campaign_type,
        data_source: campaign.data_source,
        last_updated: campaign.last_updated,
        targeting_type: campaign.targeting_type,
        daily_budget: campaign.daily_budget,
        start_date: campaign.start_date,
        end_date: campaign.end_date
      }));

      setCampaigns(formattedCampaigns);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      toast({
        title: "Error",
        description: "Failed to load campaign data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user, connectionId]);

  const refreshCampaigns = async () => {
    await fetchCampaigns();
  };

  return {
    campaigns,
    loading,
    error,
    refreshCampaigns,
  };
};
