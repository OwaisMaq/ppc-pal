
// Mock Amazon types since Amazon functionality has been removed
export interface AmazonConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  profileName: string;
  connectedAt: string;
  marketplace_id?: string;
}

export interface AmazonProfile {
  id: string;
  name: string;
  countryCode: string;
  currencyCode: string;
}
