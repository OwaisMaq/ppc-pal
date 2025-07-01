
// Mock hook for campaign data since Amazon functionality has been removed
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
}

export const useCampaignData = (connectionId?: string) => {
  // Return empty data since Amazon functionality has been removed
  return {
    campaigns: [] as CampaignData[],
    loading: false,
    error: null,
    refreshCampaigns: () => Promise.resolve(),
  };
};
