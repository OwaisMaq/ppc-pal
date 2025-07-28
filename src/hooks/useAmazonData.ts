import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Campaign, AdGroup, Keyword } from '@/lib/amazon/types';

export const useAmazonData = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

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

  const syncAllData = async (connectionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Sync function error:', error);
        throw error;
      }
      
      console.log('Sync function response:', data);
      toast.success('Data sync initiated successfully!');
      
      // Refresh data after sync with longer delay to allow API processing
      setTimeout(() => {
        fetchAllData();
        toast.info('Data refreshed - check if performance metrics are now available');
      }, 5000);
      
    } catch (error) {
      console.error('Error syncing data:', error);
      const errorMessage = error?.message || 'Failed to sync Amazon data';
      toast.error(`Sync failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getDataSummary = () => {
    const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
    const totalSales = campaigns.reduce((sum, campaign) => sum + (campaign.sales || 0), 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0);
    
    const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const avgRoas = totalSpend > 0 ? totalSales / totalSpend : 0;

    return {
      totalCampaigns: campaigns.length,
      totalAdGroups: adGroups.length,
      totalKeywords: keywords.length,
      totalSpend,
      totalSales,
      totalClicks,
      totalImpressions,
      avgAcos,
      avgRoas
    };
  };

  return {
    campaigns,
    adGroups,
    keywords,
    loading,
    fetchAllData,
    syncAllData,
    dataSummary: getDataSummary()
  };
};