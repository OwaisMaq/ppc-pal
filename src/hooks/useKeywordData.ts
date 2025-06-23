
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

      // Fetch keywords with campaign info using proper relationship specification
      let query = supabase
        .from('keywords')
        .select(`
          *,
          ad_groups!keywords_adgroup_id_fkey (
            campaign_id,
            campaigns!ad_groups_campaign_id_fkey (
              name,
              connection_id
            )
          )
        `);

      // Filter by connection IDs
      const connectionIds = connections.map(c => c.id);
      
      // First get all keywords for user's connections
      const { data: allKeywords, error: keywordsError } = await query;

      if (keywordsError) throw keywordsError;

      // Filter keywords that belong to user's connections
      const filteredKeywords = allKeywords?.filter(keyword => {
        const campaignConnectionId = keyword.ad_groups?.campaigns?.connection_id;
        const belongsToUser = connectionIds.includes(campaignConnectionId);
        
        // If connectionId is specified, also filter by that
        if (connectionId && belongsToUser) {
          return campaignConnectionId === connectionId;
        }
        
        return belongsToUser;
      }) || [];

      // Transform the data to include campaign name
      const transformedKeywords = filteredKeywords.map(keyword => ({
        ...keyword,
        campaign_name: keyword.ad_groups?.campaigns?.name || 'Unknown Campaign'
      }));

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
