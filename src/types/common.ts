
// Common types for the application
export interface AdvertisingData {
  campaigns: Campaign[];
  keywords: Keyword[];
  adGroups: AdGroup[];
  connections: Connection[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'enabled' | 'paused' | 'archived';
  sales: number;
  spend: number;
  orders: number;
  impressions: number;
  clicks: number;
  acos?: number;
  roas?: number;
  connection_id: string;
  amazon_campaign_id: string;
  campaign_type?: string;
  data_source?: string;
  last_updated?: string;
}

export interface Keyword {
  id: string;
  keyword_text: string;
  match_type: string;
  amazon_keyword_id: string;
  bid?: number;
  status: 'enabled' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  adgroup_id: string;
  campaign_name?: string;
}

export interface AdGroup {
  id: string;
  name: string;
  campaign_id: string;
  status: 'enabled' | 'paused' | 'archived';
  default_bid: number;
}

export interface Connection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  profileName: string;
  connectedAt: string;
  marketplace_id?: string;
}
