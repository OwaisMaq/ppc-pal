
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
    
    campaigns.forEach((campaign) => {
      // Extract ASIN from campaign name or amazon_campaign_id
      // ASINs are typically 10 characters starting with B0
      let asin = '';
      
      // First try to extract from campaign name (common pattern: campaign names often contain ASINs)
      const asinPattern = /B[0-9A-Z]{9}/g;
      const asinMatches = campaign.name.match(asinPattern);
      
      if (asinMatches && asinMatches.length > 0) {
        asin = asinMatches[0];
      } else {
        // If no ASIN found in name, try amazon_campaign_id as fallback
        const campaignIdMatches = campaign.amazon_campaign_id.match(asinPattern);
        if (campaignIdMatches && campaignIdMatches.length > 0) {
          asin = campaignIdMatches[0];
        } else {
          // If still no ASIN found, skip this campaign or use campaign ID as identifier
          console.log(`No ASIN found for campaign: ${campaign.name}`);
          return;
        }
      }
      
      // Extract product name from campaign name (remove ASIN and campaign-specific suffixes)
      let productName = campaign.name;
      
      // Remove ASIN from product name
      productName = productName.replace(new RegExp(asin, 'g'), '').trim();
      
      // Remove common campaign suffixes to get cleaner product names
      productName = productName
        .replace(/\s*-\s*(Auto|Manual|Exact|Broad|Phrase).*$/i, '')
        .replace(/\s*Campaign.*$/i, '')
        .replace(/\s*Ad.*$/i, '')
        .replace(/^[-\s]+|[-\s]+$/g, '') // Remove leading/trailing dashes and spaces
        .trim();
      
      // If productName is empty after cleanup, use a fallback
      if (!productName) {
        productName = `Product ${asin}`;
      }
      
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
