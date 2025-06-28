
import { useMemo } from 'react';
import { CampaignData } from '@/services/campaignDataService';

export const useCampaignFilter = (campaigns: CampaignData[], connectionId?: string) => {
  const filteredCampaigns = useMemo(() => {
    if (!connectionId) return campaigns;
    return campaigns.filter(campaign => campaign.connection_id === connectionId);
  }, [campaigns, connectionId]);

  return {
    campaigns: filteredCampaigns,
    totalCount: campaigns.length,
    filteredCount: filteredCampaigns.length
  };
};
