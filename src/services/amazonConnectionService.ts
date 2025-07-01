
import { supabase } from '@/integrations/supabase/client';

export const amazonConnectionService = {
  getConnectionStatus: async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('amazon_connections')
        .select('status, last_sync_at')
        .eq('id', connectionId)
        .single();

      if (error) throw error;

      return {
        status: data.status === 'active' ? 'connected' : 'disconnected',
        lastSync: data.last_sync_at
      };
    } catch (error) {
      console.error('Error getting connection status:', error);
      return { status: 'error' };
    }
  },

  refreshConnection: async (connectionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('amazon-refresh-token', {
        body: { connectionId }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error refreshing connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  testConnection: async (connectionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('amazon-test-connection', {
        body: { connectionId }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error testing connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  retryProfileFetch: async (connectionId: string) => {
    try {
      console.log('Retrying profile fetch for connection:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('amazon-retry-profiles', {
        body: { connectionId }
      });

      if (error) throw error;

      if (data?.profiles && data.profiles.length > 0) {
        return {
          success: true,
          message: `Found ${data.profiles.length} advertising profile(s). Connection updated.`
        };
      } else {
        return {
          success: false,
          message: 'Still no advertising profiles found. Please ensure you have set up Amazon Advertising at advertising.amazon.com and try again.'
        };
      }
    } catch (error) {
      console.error('Error retrying profile fetch:', error);
      return {
        success: false,
        message: 'Failed to retry profile fetch. Please try reconnecting your account.'
      };
    }
  },
};
