
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KeywordData {
  id: string;
  keyword_text: string;
  match_type: string;
  amazon_keyword_id: string;
  bid?: number;
  status: 'enabled' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  adgroup_id: string;
  campaign_name?: string;
}

export const useKeywordData = (connectionId?: string) => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchKeywords();
  }, [user, connectionId]);

  const fetchKeywords = async () => {
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
        setKeywords([]);
        setLoading(false);
        return;
      }

      // Fetch keywords with campaign info
      let query = supabase
        .from('keywords')
        .select(`
          *,
          ad_groups!inner (
            campaign_id,
            campaigns!inner (
              name,
              connection_id
            )
          )
        `)
        .in('ad_groups.campaigns.connection_id', connections.map(c => c.id));

      // Filter by specific connection if provided
      if (connectionId) {
        query = query.eq('ad_groups.campaigns.connection_id', connectionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include campaign name
      const transformedKeywords = data?.map(keyword => ({
        ...keyword,
        campaign_name: keyword.ad_groups?.campaigns?.name || 'Unknown Campaign'
      })) || [];

      console.log('Fetched keywords:', transformedKeywords.length);
      setKeywords(transformedKeywords);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch keywords');
      toast({
        title: "Error",
        description: "Failed to load keyword data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshKeywords = () => {
    fetchKeywords();
  };

  return {
    keywords,
    loading,
    error,
    refreshKeywords
  };
};
