
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AmazonConnection } from '@/lib/amazon/types';

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      console.log('useAmazonConnections: Fetching connections for user:', user.id);
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      console.log('Fetching Amazon connections...');
      const { data, error } = await supabase
        .from('amazon_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched connections:', data);
      console.log('Active connections:', data?.filter(c => c.status === 'active'));
      
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load Amazon connections');
    } finally {
      setLoading(false);
    }
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('Initiating Amazon connection with redirect URI:', redirectUri);
      
      // Get current session
      const session = await supabase.auth.getSession();
      console.log('Current session:', session.data.session ? 'Valid' : 'None');
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call edge function to initiate Amazon OAuth
      console.log('Calling amazon-oauth edge function...');
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'initiate', redirectUri },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      if (!data?.authUrl) {
        throw new Error('No auth URL returned from edge function');
      }

      console.log('Redirecting to Amazon OAuth URL:', data.authUrl);
      // Redirect to Amazon OAuth URL
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating connection:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Failed to initiate Amazon connection: ${error.message}`);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      console.log('Handling OAuth callback with code:', code?.substring(0, 10) + '...', 'state:', state);
      
      // Get current session
      const session = await supabase.auth.getSession();
      console.log('Session for callback:', session.data.session ? 'Valid' : 'None');
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found for callback');
      }

      // Generate the same redirect URI that was used for initiation
      const redirectUri = `${window.location.origin}/auth/amazon/callback`;

      console.log('Calling amazon-oauth callback...');
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'callback', code, state, redirectUri },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      console.log('Callback response:', { data, error });
      
      // Log the actual error details
      if (error) {
        console.error('Detailed callback error:', {
          message: error.message,
          context: error.context,
          details: error.details,
          status: error.status
        });
      }

      if (error) {
        console.error('Callback error:', error);
        throw error;
      }
      
      // Handle case where no profiles were found (setup required)
      if (data?.requiresSetup) {
        console.warn('Amazon setup required:', data);
        toast.error(data.details || 'Amazon Advertising account setup required');
        return { 
          success: false, 
          requiresSetup: true,
          error: data.error,
          details: data.details
        };
      }
      
      console.log('Connection successful, refreshing connections...');
      const profileCount = data?.profileCount || 0;
      toast.success(`Amazon account connected successfully! Found ${profileCount} advertising profile(s).`);
      await fetchConnections();
      return { success: true, profileCount };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      console.error('Callback error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Failed to complete Amazon connection: ${error.message}`);
      throw error; // Re-throw so the callback page can handle it
    }
  };

  const syncConnection = async (connectionId: string) => {
    setLoading(true);
    try {
      console.log('Syncing connection:', connectionId);
      
      // First run a health check
      const { data: healthData, error: healthError } = await supabase.functions.invoke('health-check-amazon-connections', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (healthError) {
        console.warn('Health check failed, proceeding with sync anyway:', healthError);
      } else if (healthData?.connection && !healthData.connection.healthy) {
        const issues = healthData.connection.issues || [];
        toast.error(`Connection health issues detected: ${issues.join(', ')}`);
        
        // Still proceed with sync, but warn the user
        console.warn('Connection has health issues:', issues);
      }
      
      const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { 
          connectionId,
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            endDate: new Date().toISOString()
          },
          attributionWindows: ['7d', '14d']
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Sync error:', error);
        
        // Enhanced error messages based on common issues
        if (error.message?.includes('AMAZON_TOKEN_EXPIRED')) {
          toast.error('Amazon token expired - please reconnect your account');
        } else if (error.message?.includes('AMAZON_INSUFFICIENT_PERMISSIONS')) {
          toast.error('Insufficient Amazon API permissions - check your account setup');
        } else if (error.message?.includes('Invalid access token')) {
          toast.error('Invalid Amazon token - please reconnect your account');
        } else {
          toast.error(`Sync failed: ${error.message}`);
        }
        return;
      }

      console.log('Sync response:', data);
      
      if (data?.success) {
        toast.success(`Sync completed: ${data.campaignsProcessed || 0} campaigns processed, ${data.metricsUpdated || 0} metrics updated`);
        await fetchConnections(); // Refresh connections to get updated data
      } else {
        toast.error(`Sync completed but with issues: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Enhanced error handling
      if (error.message?.includes('fetch')) {
        toast.error('Network error - please check your connection and try again');
      } else {
        toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshConnection = async (connectionId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Connection refreshed successfully!');

      // Refresh connections to get updated status
      await fetchConnections();
      
      return true;
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh connection. Please try reconnecting.');
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
      
      toast.success('Amazon connection deleted successfully!');
      await fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to delete Amazon connection');
    }
  };

  return {
    connections,
    loading,
    initiateConnection,
    handleOAuthCallback,
    syncConnection,
    deleteConnection,
    refreshConnection,
    refreshConnections: fetchConnections
  };
};
