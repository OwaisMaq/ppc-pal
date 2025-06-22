
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

  // Filter by specific product/ASIN if selected
  if (filters.selectedProduct && filters.selectedProduct !== 'all') {
    // Find campaign index that matches the ASIN pattern
    const productIndex = campaigns.findIndex((_, index) => 
      `B0${String(index + 1).padStart(7, '0')}` === filters.selectedProduct
    );
    
    if (productIndex >= 0) {
      filteredCampaigns = filteredCampaigns.filter((_, index) => index === productIndex);
      console.log(`Filtered to ${filteredCampaigns.length} campaigns for product ${filters.selectedProduct}`);
    }
  }

  return filteredCampaigns;
};
