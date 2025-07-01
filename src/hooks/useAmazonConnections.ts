
// Mock hook for Amazon connections since Amazon functionality has been removed
export interface AmazonConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  profileName: string;
  connectedAt: string;
  marketplace_id?: string;
  profile_id?: string;
  profile_name?: string;
  last_sync_at?: string;
}

export const useAmazonConnections = () => {
  // Return empty data since Amazon functionality has been removed
  return {
    connections: [] as AmazonConnection[],
    loading: false,
    error: null,
    refreshConnections: () => Promise.resolve(),
    initiateConnection: (redirectUri: string) => {
      console.log('Amazon connection initiated (mock):', redirectUri);
    },
    syncConnection: (connectionId: string) => {
      console.log('Amazon sync initiated (mock):', connectionId);
      return Promise.resolve();
    },
    deleteConnection: (connectionId: string) => {
      console.log('Amazon connection deleted (mock):', connectionId);
      return Promise.resolve();
    },
    handleOAuthCallback: (code: string, state: string) => {
      console.log('Amazon OAuth callback handled (mock):', code, state);
      return Promise.resolve({ profileCount: 0 });
    },
  };
};
