
import { CampaignData } from '@/hooks/useCampaignData';

// Enhanced filter for PPC Pal integration - strict quality requirements
export const filterRealDataOnly = (campaigns: CampaignData[]): CampaignData[] => {
  return campaigns.filter(campaign => {
    // Must be from Amazon API source
    const isRealApiSource = campaign.data_source === 'api';
    
    // Must have Amazon campaign ID and name for PPC Pal
    const hasRequiredFields = campaign.amazon_campaign_id && campaign.name;
    
    // Enhanced quality checks - must have meaningful performance metrics for PPC Pal
    const hasPerformanceMetrics = (campaign.impressions || 0) > 0 || 
                                 (campaign.clicks || 0) > 0 || 
                                 (campaign.spend || 0) > 0 ||
                                 (campaign.sales || 0) > 0;
    
    // Reject any campaign that has simulation markers
    const hasSimulationMarkers = campaign.data_source?.toLowerCase().includes('simulat') ||
                                campaign.data_source?.toLowerCase().includes('fake') ||
                                campaign.data_source?.toLowerCase().includes('test') ||
                                campaign.data_source?.toLowerCase().includes('mock') ||
                                campaign.data_source?.toLowerCase().includes('dev');
    
    // Enhanced recency check for PPC Pal - data should be relatively fresh
    const isRecentData = !campaign.last_updated || 
                        (Date.now() - new Date(campaign.last_updated).getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days
    
    return isRealApiSource && hasRequiredFields && hasPerformanceMetrics && !hasSimulationMarkers && isRecentData;
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
  
  // Enhanced quality metrics for PPC Pal integration
  const campaignsWithSales = realDataCampaigns.filter(c => (c.sales || 0) > 0).length;
  const campaignsWithSpend = realDataCampaigns.filter(c => (c.spend || 0) > 0).length;
  const campaignsWithOrders = realDataCampaigns.filter(c => (c.orders || 0) > 0).length;
  const activeCampaigns = realDataCampaigns.filter(c => c.status === 'enabled').length;
  const campaignsWithImpressions = realDataCampaigns.filter(c => (c.impressions || 0) > 0).length;
  const campaignsWithClicks = realDataCampaigns.filter(c => (c.clicks || 0) > 0).length;
  
  // Data freshness analysis for PPC Pal
  const dataAges = realDataCampaigns
    .filter(c => c.last_updated)
    .map(c => Math.round((Date.now() - new Date(c.last_updated!).getTime()) / (1000 * 60 * 60))); // hours
  
  const averageDataAge = dataAges.length > 0 
    ? Math.round(dataAges.reduce((a, b) => a + b, 0) / dataAges.length) 
    : 0;
  
  const dataQuality = averageDataAge < 1 ? 'excellent' : 
                     averageDataAge < 24 ? 'good' : 
                     averageDataAge < 168 ? 'fair' : 'poor'; // 168 hours = 1 week
  
  // PPC Pal specific metrics
  const ppcPalReadiness = realDataCount > 0 && campaignsWithPerformanceData(realDataCampaigns) > 0;
  const performanceDataCoverage = realDataCount > 0 ? 
    Math.round(((campaignsWithSales + campaignsWithSpend + campaignsWithOrders) / (realDataCount * 3)) * 100) : 0;
  
  return {
    realDataCampaigns,
    totalCampaigns,
    realDataCount,
    simulatedCount,
    hasRealData: realDataCount > 0,
    allRealData: simulatedCount === 0,
    // Enhanced metrics for PPC Pal
    campaignsWithSales,
    campaignsWithSpend,
    campaignsWithOrders,
    campaignsWithImpressions,
    campaignsWithClicks,
    activeCampaigns,
    averageDataAge,
    dataQuality,
    qualityScore: Math.round((campaignsWithSales / Math.max(realDataCount, 1)) * 100),
    completenessScore: performanceDataCoverage,
    // PPC Pal integration readiness
    ppcPalReady: ppcPalReadiness,
    performanceDataCoverage,
    metricsAvailability: {
      impressions: campaignsWithImpressions,
      clicks: campaignsWithClicks,
      spend: campaignsWithSpend,
      sales: campaignsWithSales,
      orders: campaignsWithOrders
    }
  };
};

// Helper function to count campaigns with performance data
function campaignsWithPerformanceData(campaigns: CampaignData[]): number {
  return campaigns.filter(c => 
    (c.impressions || 0) > 0 || 
    (c.clicks || 0) > 0 || 
    (c.spend || 0) > 0 || 
    (c.sales || 0) > 0 || 
    (c.orders || 0) > 0
  ).length;
}

// Enhanced utility for PPC Pal high-quality data filtering
export const filterHighQualityData = (campaigns: CampaignData[]): CampaignData[] => {
  const realCampaigns = filterRealDataOnly(campaigns);
  
  return realCampaigns.filter(campaign => {
    // High quality campaigns must have significant performance data for PPC Pal
    const hasSignificantMetrics = (campaign.impressions || 0) >= 100 || 
                                 (campaign.clicks || 0) >= 10 || 
                                 (campaign.spend || 0) >= 10 ||
                                 (campaign.sales || 0) >= 20;
    
    // Should have recent activity for PPC Pal analysis
    const hasRecentActivity = !campaign.last_updated || 
                             (Date.now() - new Date(campaign.last_updated).getTime()) < (24 * 60 * 60 * 1000); // 24 hours
    
    // Should have conversion data for PPC Pal optimization
    const hasConversionData = (campaign.orders || 0) > 0 || (campaign.sales || 0) > 0;
    
    return hasSignificantMetrics && hasRecentActivity && hasConversionData;
  });
};

// Utility for performance-based filtering specific to PPC Pal needs
export const filterPerformingCampaigns = (campaigns: CampaignData[], minRoas: number = 2): CampaignData[] => {
  const realCampaigns = filterRealDataOnly(campaigns);
  
  return realCampaigns.filter(campaign => {
    const roas = campaign.roas || 0;
    const sales = campaign.sales || 0;
    const spend = campaign.spend || 0;
    
    // Calculate ROAS if not provided (important for PPC Pal)
    const calculatedRoas = spend > 0 ? sales / spend : 0;
    const finalRoas = roas > 0 ? roas : calculatedRoas;
    
    // Must have meaningful sales for PPC Pal analysis
    return finalRoas >= minRoas && sales > 0 && spend > 0;
  });
};

// PPC Pal specific filter for campaigns ready for optimization
export const filterPPCPalReady = (campaigns: CampaignData[]): CampaignData[] => {
  const realCampaigns = filterRealDataOnly(campaigns);
  
  return realCampaigns.filter(campaign => {
    // Must have complete performance data set
    const hasCompleteData = (campaign.impressions || 0) > 0 &&
                           (campaign.clicks || 0) > 0 &&
                           (campaign.spend || 0) > 0 &&
                           (campaign.sales || 0) > 0;
    
    // Must be active for optimization
    const isActive = campaign.status === 'enabled';
    
    // Must have minimum performance thresholds
    const meetsMinimums = (campaign.impressions || 0) >= 50 &&
                         (campaign.clicks || 0) >= 5 &&
                         (campaign.spend || 0) >= 5;
    
    return hasCompleteData && isActive && meetsMinimums;
  });
};
