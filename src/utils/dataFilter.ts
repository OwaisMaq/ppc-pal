
import { CampaignData } from '@/hooks/useCampaignData';

// Enhanced filter for optimized real API data - strict quality requirements
export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from API source explicitly
    const isRealApiSource = campaign.data_source === 'api';
    
    // Must have Amazon campaign ID and name (basic validation)
    const hasRequiredFields = campaign.amazon_campaign_id && campaign.name;
    
    // Enhanced quality checks - must have some meaningful metrics
    const hasMetrics = (campaign.impressions || 0) > 0 || 
                      (campaign.clicks || 0) > 0 || 
                      (campaign.spend || 0) > 0 ||
                      (campaign.sales || 0) > 0;
    
    // Reject any campaign that has simulation markers
    const hasSimulationMarkers = campaign.data_source?.toLowerCase().includes('simulat') ||
                                campaign.data_source?.toLowerCase().includes('fake') ||
                                campaign.data_source?.toLowerCase().includes('test') ||
                                campaign.data_source?.toLowerCase().includes('mock') ||
                                campaign.data_source?.toLowerCase().includes('dev');
    
    // Enhanced recency check - data should be relatively fresh
    const isRecentData = !campaign.last_updated || 
                        (Date.now() - new Date(campaign.last_updated).getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days
    
    return isRealApiSource && hasRequiredFields && hasMetrics && !hasSimulationMarkers && isRecentData;
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
  
  // Enhanced quality metrics
  const campaignsWithSales = realDataCampaigns.filter(c => (c.sales || 0) > 0).length;
  const campaignsWithSpend = realDataCampaigns.filter(c => (c.spend || 0) > 0).length;
  const campaignsWithOrders = realDataCampaigns.filter(c => (c.orders || 0) > 0).length;
  const activeCampaigns = realDataCampaigns.filter(c => c.status === 'enabled').length;
  
  // Data freshness analysis
  const dataAges = realDataCampaigns
    .filter(c => c.last_updated)
    .map(c => Math.round((Date.now() - new Date(c.last_updated!).getTime()) / (1000 * 60 * 60))); // hours
  
  const averageDataAge = dataAges.length > 0 
    ? Math.round(dataAges.reduce((a, b) => a + b, 0) / dataAges.length) 
    : 0;
  
  const dataQuality = averageDataAge < 1 ? 'excellent' : 
                     averageDataAge < 24 ? 'good' : 
                     averageDataAge < 168 ? 'fair' : 'poor'; // 168 hours = 1 week
  
  return {
    realDataCampaigns,
    totalCampaigns,
    realDataCount,
    simulatedCount,
    hasRealData: realDataCount > 0,
    allRealData: simulatedCount === 0,
    // Enhanced metrics
    campaignsWithSales,
    campaignsWithSpend,
    campaignsWithOrders,
    activeCampaigns,
    averageDataAge,
    dataQuality,
    qualityScore: Math.round((campaignsWithSales / Math.max(realDataCount, 1)) * 100),
    completenessScore: Math.round(((campaignsWithSales + campaignsWithSpend + campaignsWithOrders) / (Math.max(realDataCount, 1) * 3)) * 100)
  };
};

// New utility function for advanced filtering
export const filterHighQualityData = (campaigns: CampaignData[]): CampaignData[] => {
  const realCampaigns = filterRealDataOnly(campaigns);
  
  return realCampaigns.filter(campaign => {
    // High quality campaigns must have meaningful performance data
    const hasSignificantMetrics = (campaign.impressions || 0) >= 100 || 
                                 (campaign.clicks || 0) >= 10 || 
                                 (campaign.spend || 0) >= 10;
    
    // Should have recent activity
    const hasRecentActivity = !campaign.last_updated || 
                             (Date.now() - new Date(campaign.last_updated).getTime()) < (24 * 60 * 60 * 1000); // 24 hours
    
    return hasSignificantMetrics && hasRecentActivity;
  });
};

// Utility for performance-based filtering
export const filterPerformingCampaigns = (campaigns: CampaignData[], minRoas: number = 2): CampaignData[] => {
  const realCampaigns = filterRealDataOnly(campaigns);
  
  return realCampaigns.filter(campaign => {
    const roas = campaign.roas || 0;
    const sales = campaign.sales || 0;
    const spend = campaign.spend || 0;
    
    // Calculate ROAS if not provided
    const calculatedRoas = spend > 0 ? sales / spend : 0;
    const finalRoas = roas > 0 ? roas : calculatedRoas;
    
    return finalRoas >= minRoas && sales > 0;
  });
};
