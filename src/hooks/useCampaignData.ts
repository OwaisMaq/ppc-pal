
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

      // Get user's connections first
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      if (connectionsError) throw connectionsError;

      if (!connections || connections.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Build query
      let query = supabase
        .from('campaigns')
        .select('*')
        .in('connection_id', connections.map(c => c.id));

      // Filter by specific connection if provided
      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched campaigns:', data?.length || 0);
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
