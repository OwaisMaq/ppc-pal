
import { CampaignData } from '@/hooks/useCampaignData';

// Strict filter for real data only - no simulated data allowed
export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from API (not simulated)
    const isRealSource = campaign.data_source !== 'simulated' && 
                        campaign.data_source !== 'simulation' &&
                        campaign.data_source !== 'fake';
    
    // Must have actual performance metrics
    const hasMetrics = (campaign.sales || 0) > 0 || 
                      (campaign.spend || 0) > 0 || 
                      (campaign.orders || 0) > 0 ||
                      (campaign.clicks || 0) > 0 ||
                      (campaign.impressions || 0) > 0;
    
    return isRealSource && hasMetrics;
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
