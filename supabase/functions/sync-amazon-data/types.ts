
export type Region = 'NA' | 'EU' | 'FE';

export function getBaseUrl(region: Region): string {
  switch (region) {
    case 'EU':
      return 'https://advertising-api-eu.amazon.com';
    case 'FE':
      return 'https://advertising-api-fe.amazon.com';
    case 'NA':
    default:
      return 'https://advertising-api.amazon.com';
  }
}

export interface Campaign {
  campaignId: string;
  name: string;
  campaignType?: string;
  targetingType?: string;
  state: 'enabled' | 'paused' | 'archived';
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
  servingStatus?: string;
  portfolioId?: string;
  sourceEndpoint?: string;
}
