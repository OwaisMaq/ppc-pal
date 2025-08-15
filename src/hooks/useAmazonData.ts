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
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns((data as any) || []);
      console.log('Fetched campaigns:', (data as any)?.length || 0);
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
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdGroups((data as any) || []);
      console.log('Fetched ad groups:', (data as any)?.length || 0);
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
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setKeywords((data as any) || []);
      console.log('Fetched keywords:', (data as any)?.length || 0);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      throw error;
    }
  };
  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('targets')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTargets((data as any) || []);
      console.log('Fetched targets:', (data as any)?.length || 0);
    } catch (error) {
      console.error('Error fetching targets:', error);
      throw error;
    }
  };

  const syncAllData = async (connectionId: string, options?: { dateRangeDays?: number; diagnosticMode?: boolean }) => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No valid session found');

      const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { connectionId, ...(options || {}) },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

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

      if (data?.diagnostics?.writeErrors?.length) {
        const first = data.diagnostics.writeErrors[0];
        toast.error(`Write error on ${first.entity || 'unknown'} ${first.id || ''}: ${first.error}`);
      }

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
    const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.cost_legacy || campaign.cost_14d || 0), 0);
    const totalSales = campaigns.reduce((sum, campaign) => sum + (campaign.attributed_sales_legacy || campaign.attributed_sales_14d || 0), 0);
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