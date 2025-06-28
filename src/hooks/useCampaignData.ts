
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { campaignDataService, CampaignData } from '@/services/campaignDataService';
import { campaignDataAnalyzer } from '@/utils/campaignDataAnalyzer';
import { useCampaignFilter } from './useCampaignFilter';

export { CampaignData } from '@/services/campaignDataService';

export const useCampaignData = (connectionId?: string) => {
  const { user } = useAuth();
  const [allCampaigns, setAllCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { campaigns, totalCount, filteredCount } = useCampaignFilter(allCampaigns, connectionId);

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

      console.log('Fetching campaigns for user:', user.id);
      if (connectionId) {
        console.log('Filtering by connection:', connectionId);
      }

      // Get user connections
      const connections = await campaignDataService.fetchUserConnections(user.id);
      
      if (!connections.length) {
        console.log('No Amazon connections found');
        setAllCampaigns([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${connections.length} connections`);

      // Fetch campaigns
      const campaignData = await campaignDataService.fetchCampaigns(
        connections.map(c => c.id),
        connectionId
      );

      // Analyze and log campaign data
      const analysis = campaignDataAnalyzer.analyzeCampaigns(campaignData);
      campaignDataAnalyzer.logAnalysis(analysis, campaignData);

      setAllCampaigns(campaignData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch campaigns';
      setError(errorMessage);
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
    allCampaigns,
    totalCount,
    filteredCount,
    loading,
    error,
    refreshCampaigns
  };
};
