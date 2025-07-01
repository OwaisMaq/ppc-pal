
// Mock hook for Amazon connections since Amazon functionality has been removed
export interface AmazonConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  profileName: string;
  connectedAt: string;
  marketplace_id?: string;
}

export const useAmazonConnections = () => {
  // Return empty data since Amazon functionality has been removed
  return {
    connections: [] as AmazonConnection[],
    loading: false,
    error: null,
    refreshConnections: () => Promise.resolve(),
  };
};
