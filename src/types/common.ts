
// Common types for the application
export interface AdvertisingData {
  campaigns: Campaign[];
  keywords: Keyword[];
  adGroups: AdGroup[];
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  sales: number;
  spend: number;
  orders: number;
  acos: number;
}

export interface Keyword {
  id: string;
  text: string;
  campaignId: string;
  bid: number;
  impressions: number;
  clicks: number;
  sales: number;
}

export interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  status: string;
}

export interface Connection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  profileName: string;
  connectedAt: string;
}
