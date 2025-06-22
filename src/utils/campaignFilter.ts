
import { CampaignData } from '@/hooks/useCampaignData';
import { AmazonConnection } from '@/lib/amazon/types';
import { FilterParams } from '@/types/performance';

export const filterCampaigns = (
  campaigns: CampaignData[],
  connections: AmazonConnection[],
  filters: FilterParams
): CampaignData[] => {
  let filteredCampaigns = campaigns;
  
  if (filters.selectedCountry && filters.selectedCountry !== 'all') {
    // Find connections for the selected country
    const countryConnections = connections
      .filter(conn => conn.marketplace_id === filters.selectedCountry)
      .map(conn => conn.id);
    
    filteredCampaigns = filteredCampaigns.filter(campaign => 
      countryConnections.includes(campaign.connection_id)
    );
    
    console.log(`Filtered to ${filteredCampaigns.length} campaigns for country ${filters.selectedCountry}`);
  }

  // Filter by specific campaign if selected
  if (filters.selectedCampaign && filters.selectedCampaign !== 'all') {
    filteredCampaigns = filteredCampaigns.filter(campaign => 
      campaign.id === filters.selectedCampaign
    );
    
    console.log(`Filtered to ${filteredCampaigns.length} campaigns for campaign ${filters.selectedCampaign}`);
  }

  // Filter by specific ASIN if selected
  if (filters.selectedProduct && filters.selectedProduct !== 'all') {
    // Filter campaigns that contain the selected ASIN in their name or campaign ID
    const asinPattern = new RegExp(filters.selectedProduct, 'i');
    
    filteredCampaigns = filteredCampaigns.filter(campaign => {
      // Check if ASIN is in campaign name or amazon_campaign_id
      return asinPattern.test(campaign.name) || asinPattern.test(campaign.amazon_campaign_id);
    });
    
    console.log(`Filtered to ${filteredCampaigns.length} campaigns for ASIN ${filters.selectedProduct}`);
  }

  return filteredCampaigns;
};
