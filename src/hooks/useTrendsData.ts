
import React from 'react';
import { CampaignData } from './useCampaignData';
import { AmazonConnection } from '@/lib/amazon/types';
import { filterRealDataOnly } from '@/utils/dataFilter';

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

    // Filter to real API data only - NO SIMULATED DATA
    const realCampaigns = filterRealDataOnly(campaigns);
    
    if (!realCampaigns.length) {
      console.log('❌ No real API data campaigns available for trends');
      return [];
    }

    console.log('📈 Generating trends from', realCampaigns.length, 'real API campaigns');

    // Filter campaigns based on selections
    let filteredCampaigns = realCampaigns;
    
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
      const asinPattern = new RegExp(selectedProduct, 'i');
      filteredCampaigns = filteredCampaigns.filter(campaign => {
        return asinPattern.test(campaign.name) || asinPattern.test(campaign.amazon_campaign_id);
      });
    }

    if (!filteredCampaigns.length) {
      console.log('❌ No real API campaigns match the current filters');
      return [];
    }

    console.log('✅ Generating trends from', filteredCampaigns.length, 'filtered real API campaigns');

    // If we have real data, create trend data based on actual metrics
    // For now, we'll show current period data - in the future this could be enhanced with historical data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    const totalSales = filteredCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalProfit = totalSales - totalSpend;

    // For real trend data, we would need historical data from the database
    // For now, show the current month's data and zeros for previous months
    return months.map((month, index) => {
      if (index === months.length - 1) {
        // Current month - show actual data
        return {
          name: month,
          sales: Math.round(totalSales),
          spend: Math.round(totalSpend),
          profit: Math.round(totalProfit)
        };
      } else {
        // Previous months - show zero (would need historical data)
        return {
          name: month,
          sales: 0,
          spend: 0,
          profit: 0
        };
      }
    });
  }, [campaigns, connections, selectedCountry, selectedCampaign, selectedProduct]);

  return trendsData;
};
