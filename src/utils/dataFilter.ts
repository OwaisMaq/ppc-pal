
import { CampaignData } from '@/hooks/useCampaignData';

// Ultra-strict filter for real data only - absolutely no simulated data allowed
export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from API source explicitly - reject anything that's not API
    const isRealApiSource = campaign.data_source === 'api';
    
    // Additional safety check - reject any campaign that looks like simulation
    const hasSimulationMarkers = campaign.data_source?.toLowerCase().includes('simulat') ||
                                campaign.data_source?.toLowerCase().includes('fake') ||
                                campaign.data_source?.toLowerCase().includes('test') ||
                                campaign.data_source?.toLowerCase().includes('mock');
    
    // Must have real performance metrics AND be from API source
    const hasRealMetrics = (campaign.sales || 0) > 0 || 
                          (campaign.spend || 0) > 0 || 
                          (campaign.orders || 0) > 0 ||
                          (campaign.clicks || 0) > 0 ||
                          (campaign.impressions || 0) > 0;
    
    // STRICT: Only allow if it's explicitly from API and has no simulation markers
    return isRealApiSource && !hasSimulationMarkers && hasRealMetrics;
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
