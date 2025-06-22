
import React from 'react';
import { CampaignData } from './useCampaignData';
import { AmazonConnection } from '@/lib/amazon/types';

interface TrendData {
  name: string;
  sales: number;
  spend: number;
  profit: number;
}

export const useTrendsData = (
  campaigns: CampaignData[],
  connections: AmazonConnection[],
  selectedCountry: string,
  selectedCampaign: string,
  selectedProduct: string
): TrendData[] => {
  const trendsData = React.useMemo(() => {
    if (!campaigns.length) return [];

    // Filter campaigns based on selections
    let filteredCampaigns = campaigns;
    
    if (selectedCountry !== 'all') {
      const countryConnections = connections
        .filter(conn => conn.marketplace_id === selectedCountry)
        .map(conn => conn.id);
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        countryConnections.includes(campaign.connection_id)
      );
    }

    if (selectedCampaign !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        campaign.id === selectedCampaign
      );
    }

    if (selectedProduct !== 'all') {
      // Filter by specific product/ASIN (using campaign as proxy)
      const productIndex = campaigns.findIndex((_, index) => 
        `B0${String(index + 1).padStart(7, '0')}` === selectedProduct
      );
      if (productIndex >= 0) {
        filteredCampaigns = [campaigns[productIndex]];
      }
    }

    // Generate monthly trend data from campaigns
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return months.map((month, index) => {
      const monthMultiplier = 0.6 + (index * 0.1); // Growing trend
      
      const sales = filteredCampaigns.reduce((sum, c) => 
        sum + (c.sales || 0) * monthMultiplier, 0
      );
      const spend = filteredCampaigns.reduce((sum, c) => 
        sum + (c.spend || 0) * monthMultiplier, 0
      );
      const profit = sales - spend;

      return {
        name: month,
        sales: Math.round(sales),
        spend: Math.round(spend),
        profit: Math.round(profit)
      };
    });
  }, [campaigns, connections, selectedCountry, selectedCampaign, selectedProduct]);

  return trendsData;
};
