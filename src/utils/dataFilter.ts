
import { CampaignData } from '@/hooks/useCampaignData';

// Strict filter for real API data only - no simulated data allowed
export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from API source explicitly
    const isRealApiSource = campaign.data_source === 'api';
    
    // Must have Amazon campaign ID and name (basic validation)
    const hasRequiredFields = campaign.amazon_campaign_id && campaign.name;
    
    // Reject any campaign that has simulation markers
    const hasSimulationMarkers = campaign.data_source?.toLowerCase().includes('simulat') ||
                                campaign.data_source?.toLowerCase().includes('fake') ||
                                campaign.data_source?.toLowerCase().includes('test') ||
                                campaign.data_source?.toLowerCase().includes('mock');
    
    return isRealApiSource && hasRequiredFields && !hasSimulationMarkers;
  });
};

export const hasRealData = (campaigns: CampaignData[]): boolean => {
  return filterRealDataOnly(campaigns).length > 0;
};

export const getRealDataStats = (campaigns: CampaignData[]) => {
  const realDataCampaigns = filterRealDataOnly(campaigns);
  const totalCampaigns = campaigns.length;
  const realDataCount = realDataCampaigns.length;
  const simulatedCount = totalCampaigns - realDataCount;
  
  return {
    realDataCampaigns,
    totalCampaigns,
    realDataCount,
    simulatedCount,
    hasRealData: realDataCount > 0,
    allRealData: simulatedCount === 0
  };
};
