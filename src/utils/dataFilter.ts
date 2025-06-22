
import { CampaignData } from '@/hooks/useCampaignData';

export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => 
    campaign.data_source !== 'simulated' && 
    campaign.data_source !== 'simulation'
  );
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
