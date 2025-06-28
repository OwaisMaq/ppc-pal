
import { CampaignData } from '@/services/campaignDataService';

export interface CampaignAnalysis {
  totalCampaigns: number;
  campaignsBySource: Record<string, number>;
  campaignsByStatus: Record<string, number>;
  campaignsWithPerformanceData: number;
  apiCampaigns: number;
  hasRealData: boolean;
}

export const campaignDataAnalyzer = {
  analyzeCampaigns(campaigns: CampaignData[]): CampaignAnalysis {
    const byDataSource = campaigns.reduce((acc, campaign) => {
      const source = campaign.data_source || 'undefined';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = campaigns.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const withPerformanceData = campaigns.filter(c => 
      (c.sales || 0) > 0 || 
      (c.spend || 0) > 0 || 
      (c.orders || 0) > 0 ||
      (c.clicks || 0) > 0 ||
      (c.impressions || 0) > 0
    );

    const apiCampaigns = campaigns.filter(c => c.data_source === 'api');

    return {
      totalCampaigns: campaigns.length,
      campaignsBySource: byDataSource,
      campaignsByStatus: byStatus,
      campaignsWithPerformanceData: withPerformanceData.length,
      apiCampaigns: apiCampaigns.length,
      hasRealData: apiCampaigns.length > 0
    };
  },

  logAnalysis(analysis: CampaignAnalysis, campaigns: CampaignData[]) {
    console.log('=== CAMPAIGN DATA ANALYSIS ===');
    console.log(`Total campaigns: ${analysis.totalCampaigns}`);
    console.log('By data source:', analysis.campaignsBySource);
    console.log('By status:', analysis.campaignsByStatus);
    console.log(`With performance data: ${analysis.campaignsWithPerformanceData}`);
    console.log(`API campaigns: ${analysis.apiCampaigns}`);

    if (analysis.hasRealData) {
      console.log('✅ Real Amazon API campaigns available');
      const sampleApiCampaign = campaigns.find(c => c.data_source === 'api');
      if (sampleApiCampaign) {
        console.log('Sample API campaign:', {
          name: sampleApiCampaign.name,
          amazon_campaign_id: sampleApiCampaign.amazon_campaign_id,
          status: sampleApiCampaign.status
        });
      }
    } else {
      console.log('⚠️ No API campaigns found - sync may be needed');
    }
  }
};
