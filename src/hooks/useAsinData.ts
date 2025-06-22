
import { useMemo } from 'react';
import { CampaignData } from './useCampaignData';

export interface AsinOption {
  value: string;
  label: string;
  asin: string;
  productName: string;
  campaignId: string;
}

export const useAsinData = (campaigns: CampaignData[]) => {
  const asinOptions = useMemo(() => {
    const options: AsinOption[] = [{ 
      value: "all", 
      label: "All Products", 
      asin: "",
      productName: "",
      campaignId: ""
    }];
    
    campaigns.forEach((campaign, index) => {
      // Generate realistic ASIN from campaign data
      const asin = `B0${String(index + 1).padStart(7, '0')}`;
      const productName = campaign.name.length > 30 
        ? `${campaign.name.substring(0, 30)}...` 
        : campaign.name;
      
      options.push({
        value: asin,
        label: `${asin} - ${productName}`,
        asin,
        productName: campaign.name,
        campaignId: campaign.id
      });
    });
    
    return options.slice(0, 21); // Limit to 20 ASINs + "All Products"
  }, [campaigns]);

  return { asinOptions };
};
