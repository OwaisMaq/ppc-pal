
import { useMemo } from 'react';
import { CampaignData } from './useCampaignData';

export interface AsinOption {
  value: string;
  label: string;
  asin: string;
  productName: string;
  campaignIds: string[]; // Track which campaigns are associated with this ASIN
}

export const useAsinData = (campaigns: CampaignData[]) => {
  const asinOptions = useMemo(() => {
    const options: AsinOption[] = [{ 
      value: "all", 
      label: "All Products", 
      asin: "",
      productName: "",
      campaignIds: []
    }];
    
    // Create a map to group campaigns by ASIN
    const asinMap = new Map<string, {
      productName: string;
      campaignIds: string[];
    }>();
    
    campaigns.forEach((campaign, index) => {
      // Generate realistic ASIN from campaign index
      const asin = `B0${String(index + 1).padStart(7, '0')}`;
      
      // Extract product name from campaign name (remove campaign-specific suffixes)
      let productName = campaign.name;
      
      // Remove common campaign suffixes to get cleaner product names
      productName = productName
        .replace(/\s*-\s*(Auto|Manual|Exact|Broad|Phrase).*$/i, '')
        .replace(/\s*Campaign.*$/i, '')
        .replace(/\s*Ad.*$/i, '')
        .trim();
      
      if (asinMap.has(asin)) {
        // ASIN already exists, add this campaign to it
        const existing = asinMap.get(asin)!;
        existing.campaignIds.push(campaign.id);
      } else {
        // New ASIN
        asinMap.set(asin, {
          productName,
          campaignIds: [campaign.id]
        });
      }
    });
    
    // Convert map to options array
    Array.from(asinMap.entries()).forEach(([asin, data]) => {
      options.push({
        value: asin,
        label: `${asin} - ${data.productName}`,
        asin,
        productName: data.productName,
        campaignIds: data.campaignIds
      });
    });
    
    // Sort by ASIN for consistent ordering
    return options.slice(0, 1).concat(
      options.slice(1).sort((a, b) => a.asin.localeCompare(b.asin))
    );
  }, [campaigns]);

  return { asinOptions };
};
