
// Mock Amazon connection service since Amazon functionality has been removed
export const amazonConnectionService = {
  getConnectionStatus: () => Promise.resolve({ status: 'disconnected' }),
  refreshConnection: () => Promise.resolve({ success: false }),
  testConnection: () => Promise.resolve({ success: false }),
};
