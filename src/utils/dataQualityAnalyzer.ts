import { Campaign } from '@/hooks/useCampaignData';

export interface DataQualityInfo {
  hasSimulatedData: boolean;
  dataSourceInfo: string;
}

export const analyzeDataQuality = (campaigns: Campaign[]): DataQualityInfo => {
  const simulatedDataCampaigns = campaigns.filter(c => c.data_source === 'simulated');
  const hasSimulatedData = simulatedDataCampaigns.length > 0;
  
  let dataSourceInfo = '';
  if (hasSimulatedData) {
    if (simulatedDataCampaigns.length === campaigns.length) {
      dataSourceInfo = 'All data is simulated due to API limitations';
    } else {
      dataSourceInfo = `${simulatedDataCampaigns.length} of ${campaigns.length} campaigns using simulated data`;
    }
  } else {
    dataSourceInfo = 'All data from Amazon API';
  }

  return { hasSimulatedData, dataSourceInfo };
};
