
export interface ConnectionData {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  profile_id: string;
  status: string;
}

export interface CampaignData {
  campaignId: string;
  name: string;
  campaignType: string;
  targetingType: string;
  state: string;
  dailyBudget: number;
  startDate?: string;
  endDate?: string;
}

export interface AdGroupData {
  adGroupId: string;
  name: string;
  state: string;
  defaultBid: number;
}

export interface MetricsData {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
}

export const REGIONS = ['na', 'eu', 'fe'] as const;
export type Region = typeof REGIONS[number];

export const getBaseUrl = (region: Region): string => {
  return `https://advertising-api${region === 'na' ? '' : '-' + region}.amazon.com`;
};
