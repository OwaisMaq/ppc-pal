
import { CampaignData } from '@/hooks/useCampaignData';
import { AmazonConnection } from '@/lib/amazon/types';
import { FilterParams } from '@/types/performance';

export const filterCampaigns = (
  campaigns: CampaignData[],
  connections: AmazonConnection[],
  filters: FilterParams
): CampaignData[] => {
  console.log('=== CAMPAIGN FILTERING DEBUG ===');
  console.log('Input campaigns:', campaigns.length);
  console.log('Available connections:', connections.length);
  console.log('Filters applied:', filters);
  
  let filteredCampaigns = [...campaigns];
  
  // Filter by country/marketplace
  if (filters.selectedCountry) {
    console.log(`Filtering by country: ${filters.selectedCountry}`);
    
    // Find connections for the selected country
    const countryConnections = connections
      .filter(conn => {
        console.log(`Connection ${conn.id}: marketplace ${conn.marketplace_id}`);
        return conn.marketplace_id === filters.selectedCountry;
      })
      .map(conn => conn.id);
    
    console.log(`Found ${countryConnections.length} connections for country ${filters.selectedCountry}:`, countryConnections);
    
    if (countryConnections.length > 0) {
      filteredCampaigns = filteredCampaigns.filter(campaign => {
        const matches = countryConnections.includes(campaign.connection_id);
        if (!matches) {
          console.log(`Campaign ${campaign.name} filtered out - connection ${campaign.connection_id} not in country connections`);
        }
        return matches;
      });
    } else {
      console.log(`⚠️ No connections found for country ${filters.selectedCountry}, returning empty results`);
      filteredCampaigns = [];
    }
    
    console.log(`After country filter: ${filteredCampaigns.length} campaigns`);
  }

  // Filter by specific campaign if selected
  if (filters.selectedCampaign) {
    console.log(`Filtering by campaign: ${filters.selectedCampaign}`);
    filteredCampaigns = filteredCampaigns.filter(campaign => 
      campaign.id === filters.selectedCampaign
    );
    console.log(`After campaign filter: ${filteredCampaigns.length} campaigns`);
  }

  // Filter by specific ASIN if selected
  if (filters.selectedProduct) {
    console.log(`Filtering by product/ASIN: ${filters.selectedProduct}`);
    const asinPattern = new RegExp(filters.selectedProduct, 'i');
    
    filteredCampaigns = filteredCampaigns.filter(campaign => {
      const matches = asinPattern.test(campaign.name) || asinPattern.test(campaign.amazon_campaign_id);
      if (!matches) {
        console.log(`Campaign ${campaign.name} filtered out - doesn't match ASIN pattern`);
      }
      return matches;
    });
    console.log(`After ASIN filter: ${filteredCampaigns.length} campaigns`);
  }

  console.log(`✓ Final filtered campaigns: ${filteredCampaigns.length}`);
  
  // Log sample of final results
  if (filteredCampaigns.length > 0) {
    console.log('Sample filtered results:');
    filteredCampaigns.slice(0, 3).forEach((campaign, index) => {
      console.log(`  ${index + 1}. ${campaign.name} - Sales: ${campaign.sales}, Data Source: ${campaign.data_source}`);
    });
  }

  return filteredCampaigns;
};
