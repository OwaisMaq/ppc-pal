import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Campaign, AdGroup, Keyword, Target } from '@/lib/amazon/types';

export const useAmazonData = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSyncDiagnostics, setLastSyncDiagnostics] = useState<any | null>(null);

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
        fetchKeywords(),
        fetchTargets()
      ]);
    } catch (error) {
      console.error('Error fetching Amazon data:', error);
      toast.error('Failed to load Amazon data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!user?.id) {
      console.log('No user available for fetching campaigns');
      return;
    }
    
    try {
      // Step 1: Get user's connection IDs
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      const connectionIds = (connections || []).map(c => c.id);
      
      if (connectionIds.length === 0) {
        setCampaigns([]);
        return;
      }

      // Step 2: Get campaigns for these connections
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
      console.log('Fetched campaigns for user:', user.id, 'count:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  };

  const fetchAdGroups = async () => {
    if (!user?.id) {
      console.log('No user available for fetching ad groups');
      return;
    }
    
    try {
      // Step 1: Get user's connection IDs
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      const connectionIds = (connections || []).map(c => c.id);
      
      if (connectionIds.length === 0) {
        setAdGroups([]);
        return;
      }

      // Step 2: Get campaigns for these connections
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .in('connection_id', connectionIds);

      const campaignIds = (campaigns || []).map(c => c.id);
      
      if (campaignIds.length === 0) {
        setAdGroups([]);
        return;
      }

      // Step 3: Get ad groups for these campaigns
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdGroups(data || []);
      console.log('Fetched ad groups for user:', user.id, 'count:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching ad groups:', error);
      throw error;
    }
  };

  const fetchKeywords = async () => {
    if (!user?.id) {
      console.log('No user available for fetching keywords');
      return;
    }
    
    try {
      // Step 1: Get user's connection IDs
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      const connectionIds = (connections || []).map(c => c.id);
      
      if (connectionIds.length === 0) {
        setKeywords([]);
        return;
      }

      // Step 2: Get campaigns for these connections
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .in('connection_id', connectionIds);

      const campaignIds = (campaigns || []).map(c => c.id);
      
      if (campaignIds.length === 0) {
        setKeywords([]);
        return;
      }

      // Step 3: Get ad groups for these campaigns
      const { data: adGroups } = await supabase
        .from('ad_groups')
        .select('id')
        .in('campaign_id', campaignIds);

      const adGroupIds = (adGroups || []).map(ag => ag.id);
      
      if (adGroupIds.length === 0) {
        setKeywords([]);
        return;
      }

      // Step 4: Get keywords for these ad groups
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .in('adgroup_id', adGroupIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setKeywords(data || []);
      console.log('Fetched keywords for user:', user.id, 'count:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      throw error;
    }
  };

  const fetchTargets = async () => {
    if (!user?.id) {
      console.log('No user available for fetching targets');
      return;
    }
    
    try {
      // Step 1: Get user's connection IDs
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', user.id);

      const connectionIds = (connections || []).map(c => c.id);
      
      if (connectionIds.length === 0) {
        setTargets([]);
        return;
      }

      // Step 2: Get campaigns for these connections
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .in('connection_id', connectionIds);

      const campaignIds = (campaigns || []).map(c => c.id);
      
      if (campaignIds.length === 0) {
        setTargets([]);
        return;
      }

      // Step 3: Get ad groups for these campaigns
      const { data: adGroups } = await supabase
        .from('ad_groups')
        .select('id')
        .in('campaign_id', campaignIds);

      const adGroupIds = (adGroups || []).map(ag => ag.id);
      
      if (adGroupIds.length === 0) {
        setTargets([]);
        return;
      }

      // Step 4: Get targets for these ad groups
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .in('adgroup_id', adGroupIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTargets(data || []);
      console.log('Fetched targets for user:', user.id, 'count:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching targets:', error);
      throw error;
    }
  };

  const syncAllData = async (connectionId: string, options?: { dateRangeDays?: number; diagnosticMode?: boolean; timeUnit?: 'DAILY' | 'SUMMARY' }) => {
    setLoading(true);
    try {
      console.log('Starting sync for connection:', connectionId, 'user:', user?.id);
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No valid session found');

      // Verify the connection belongs to the current user
      const { data: connection, error: connError } = await supabase
        .from('amazon_connections')
        .select('id, status, profile_name, last_sync_at')
        .eq('id', connectionId)
        .eq('user_id', user?.id)
        .single();

      if (connError || !connection) {
        throw new Error('Connection not found or not authorized');
      }

      console.log('Syncing connection:', connection.profile_name, 'status:', connection.status);

      const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { connectionId, ...(options || {}) },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error('Sync edge function error:', error);
        throw error;
      }

      console.log('Sync response:', data);

      if (data && data.success === false) {
        const counts = data.entitiesSynced ? ` (campaigns: ${data.entitiesSynced.campaigns || 0}, ad groups: ${data.entitiesSynced.adGroups || 0}, keywords: ${data.entitiesSynced.keywords || 0}, targets: ${data.entitiesSynced.targets || 0})` : '';
        if (data.code === 'NO_CAMPAIGNS') {
          toast.info(`No campaigns found for this profile.${counts}`);
        } else if (data.code === 'NO_METRICS_UPDATED') {
          toast.warning(`Synced entities, but no performance metrics were updated yet.${counts}`);
        } else {
          toast.info(`${data.message || 'Sync completed with notices.'}${counts}`);
        }
      } else {
        const counts = data?.entitiesSynced ? ` (campaigns: ${data.entitiesSynced.campaigns || 0}, ad groups: ${data.entitiesSynced.adGroups || 0}, keywords: ${data.entitiesSynced.keywords || 0}, targets: ${data.entitiesSynced.targets || 0}; metrics updated: ${data.metricsUpdated || 0})` : '';
        toast.success(`Data sync completed successfully!${counts}`);
      }

      setLastSyncDiagnostics(data?.diagnostics || null);

      if (data?.diagnostics?.rollupError) {
        console.error('Roll-up error:', data.diagnostics.rollupError);
        toast.warning(`Data synced but roll-up failed: ${data.diagnostics.rollupError}`);
      }

      if (data?.diagnostics?.writeErrors?.length) {
        const first = data.diagnostics.writeErrors[0];
        console.error('Write error details:', first);
        toast.error(`Write error on ${first.entity || 'unknown'} ${first.id || ''}: ${first.error}`);
      }

      // Refresh data immediately and then again after 3 seconds to catch any delayed updates
      fetchAllData();
      setTimeout(() => {
        fetchAllData();
      }, 3000);
    } catch (error: any) {
      console.error('Error syncing data:', error);
      toast.error(error.message || 'Failed to sync Amazon data');
    } finally {
      setLoading(false);
    }
  };

  const getDataSummary = () => {
    // FIXED: Use fallback selectors for existing metrics fields 
    const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.cost_legacy || campaign.cost_14d || 0), 0);
    const totalSales = campaigns.reduce((sum, campaign) => sum + (campaign.attributed_sales_legacy || campaign.attributed_sales_14d || 0), 0);
    // Use any available click/impression fields based on the DB schema
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
    targets,
    loading,
    fetchAllData,
    syncAllData,
    dataSummary: getDataSummary(),
    lastSyncDiagnostics,
  };
};