
import React from 'react';
import { Campaign } from './useCampaignData';
import { AmazonConnection } from './useAmazonConnections';

interface TrendData {
  name: string;
  sales: number;
  spend: number;
  profit: number;
  orders: number;
  impressions: number;
  clicks: number;
  acos: number;
  roas: number;
}

export const useTrendsData = (
  campaigns: Campaign[],
  connections: AmazonConnection[],
  selectedCountry: string,
  selectedCampaign: string,
  selectedProduct: string
): TrendData[] => {
  const trendsData = React.useMemo(() => {
    // Since Amazon functionality has been removed, return empty trends
    return [] as TrendData[];
  }, [campaigns, connections, selectedCountry, selectedCampaign, selectedProduct]);

  return trendsData;
};
