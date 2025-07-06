
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AmazonConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error' | 'setup_required';
  profileName: string;
  connectedAt: string;
  marketplace_id?: string;
  profile_id?: string;
  profile_name?: string;
  last_sync_at?: string;
  campaign_count?: number;
  needs_sync?: boolean;
  setup_required_reason?: string;
}

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const oauthCallbackCache = useRef<Map<string, Promise<any>>>(new Map());
  const fetchingRef = useRef(false);

  const fetchConnections = async () => {
    if (!user) {
      console.log('=== No User Found ===');
      setLoading(false);
      return;
    }

    if (fetchingRef.current) {
      console.log('=== Fetch Already in Progress ===');
      return;
    }

    fetchingRef.current = true;
    console.log('=== Fetching Amazon Connections ===');
    setLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from('amazon_connections')
        .select(`
          *,
          campaigns(count)
        `, { count: 'exact' })
        .eq('user_id', user.id);

      console.log('=== Raw Database Query Result ===');
      console.log('Data present:', !!data);
      console.log('Data length:', data?.length || 0);
      console.log('Error present:', !!error);
      
      if (error) {
        console.error('=== Supabase Query Error ===');
        console.error('Error details:', error);
        throw error;
      }

      if (!data) {
        console.log('=== No Data Returned ===');
        setConnections([]);
        setError(null);
        return;
      }

      console.log('=== Processing Connection Data ===');
      console.log('Raw connection data from DB:', data);

      const formattedConnections: AmazonConnection[] = data.map((conn: any, index: number) => {
        console.log(`=== Processing Connection ${index + 1} ===`);
        console.log('Connection details:', {
          id: conn.id,
          profile_id: conn.profile_id,
          profile_name: conn.profile_name,
          status: conn.status,
          marketplace_id: conn.marketplace_id,
          last_sync_at: conn.last_sync_at,
          campaigns: conn.campaigns
        });
        
        const campaignCount = Array.isArray(conn.campaigns) ? conn.campaigns.length : 0;
        const hasBeenSynced = conn.last_sync_at && campaignCount > 0;
        const isActive = conn.status === 'active';
        
        // Improved connection status determination
        let connectionStatus: 'connected' | 'disconnected' | 'error' | 'setup_required';
        let setupRequiredReason: string | undefined;
        
        if (!isActive) {
          connectionStatus = 'error';
          console.log('Status: error (connection not active)');
        } else if (!conn.profile_id || conn.profile_id === 'setup_required_no_profiles_found') {
          connectionStatus = 'setup_required';
          setupRequiredReason = 'no_advertising_profiles';
          console.log('Status: setup_required (no valid advertising profile)');
        } else if (!conn.last_sync_at) {
          connectionStatus = 'setup_required';
          setupRequiredReason = 'needs_sync';
          console.log('Status: setup_required (never synced)');
        } else if (campaignCount === 0) {
          // If synced but no campaigns, could be either no campaigns exist or needs re-sync
          connectionStatus = 'setup_required';
          setupRequiredReason = 'needs_sync';
          console.log('Status: setup_required (synced but no campaigns found)');
        } else {
          connectionStatus = 'connected';
          console.log('Status: connected (fully operational)');
        }

        // Check token expiry
        if (conn.token_expires_at) {
          const tokenExpiry = new Date(conn.token_expires_at);
          const now = new Date();
          if (tokenExpiry <= now) {
            connectionStatus = 'error';
            setupRequiredReason = 'token_expired';
            console.log('Status overridden to error (token expired)');
          }
        }
        
        const formatted = {
          id: conn.id,
          status: connectionStatus,
          profileName: conn.profile_name || `${conn.marketplace_id} Profile` || 'Amazon Profile',
          connectedAt: conn.created_at,
          marketplace_id: conn.marketplace_id,
          profile_id: conn.profile_id,
          profile_name: conn.profile_name,
          last_sync_at: conn.last_sync_at,
          campaign_count: campaignCount,
          needs_sync: !hasBeenSynced || campaignCount === 0,
          setup_required_reason: setupRequiredReason
        };
        
        console.log('Final formatted connection:', formatted);
        return formatted;
      });

      console.log('=== Final Processing Results ===');
      console.log('Total connections processed:', formattedConnections.length);
      console.log('Connection statuses:', formattedConnections.map(c => ({ id: c.id, status: c.status })));
      
      setConnections(formattedConnections);
      setError(null);
      
    } catch (err) {
      console.error('=== Fetch Connections Error ===');
      console.error('Error details:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(errorMessage);
      setConnections([]);
      
      toast({
        title: "Connection Error",
        description: "Failed to load your Amazon connections. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const refreshConnections = async () => {
    console.log('=== Manual Refresh Triggered ===');
    await fetchConnections();
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('=== Initiating Amazon Connection ===');
      
      toast({
        title: "Connecting to Amazon",
        description: "Initializing connection to Amazon Advertising...",
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri }
      });

      console.log('=== OAuth Init Response ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('=== OAuth Init Error ===');
        console.error('Error details:', error);
        
        let userMessage = 'Failed to initialize Amazon connection';
        if (typeof error === 'object' && error.message) {
          userMessage = error.message;
        } else if (typeof error === 'string') {
          userMessage = error;
        }
        
        throw new Error(userMessage);
      }

      if (data?.error) {
        console.error('=== OAuth Init Returned Error ===');
        console.error('Server error:', data.error);
        throw new Error(data.details || data.error);
      }

      if (data?.authUrl) {
        console.log('=== Redirecting to Amazon ===');
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 100);
      } else {
        throw new Error('No authorization URL received from server');
      }
    } catch (err) {
      console.error('=== Connection Initiation Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to initiate Amazon connection';
      if (err instanceof Error) {
        userMessage = err.message;
      }
      
      toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive",
      });
    }
  };

  const syncConnection = async (connectionId: string) => {
    try {
      console.log('=== Syncing Connection ===');
      console.log('Connection ID:', connectionId);
      
      toast({
        title: "Sync Started",
        description: "Fetching your campaign data from Amazon. This may take a few moments...",
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId }
      });

      console.log('=== Sync Response ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('=== Sync Error ===');
        console.error('Error details:', error);
        
        let userMessage = 'Failed to sync campaign data';
        if (typeof error === 'object' && error.message) {
          userMessage = error.message;
        } else if (typeof error === 'string') {
          userMessage = error;
        }
        
        throw new Error(userMessage);
      }

      if (data?.error) {
        console.error('=== Sync Returned Error ===');
        console.error('Server error:', data.error);
        
        if (data.requiresSetup || data.error === 'Profile setup required') {
          toast({
            title: "Amazon Advertising Setup Required",
            description: "Please set up your Amazon Advertising account at advertising.amazon.com first, then try 'Force Sync' to import your campaigns.",
            variant: "destructive",
          });
        } else if (data.requiresReconnection) {
          toast({
            title: "Reconnection Required",
            description: data.details || "Please reconnect your Amazon account to continue syncing",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sync Failed",
            description: data.details || data.error,
            variant: "destructive",
          });
        }
        
        await refreshConnections();
        return;
      }

      const campaignCount = data?.campaignsSynced || data?.campaignCount || 0;
      
      toast({
        title: "Sync Complete",
        description: campaignCount > 0 
          ? `Successfully synced ${campaignCount} campaigns from Amazon.`
          : "Sync completed, but no campaigns were found. Please check your Amazon Advertising account.",
      });

      await refreshConnections();
    } catch (err) {
      console.error('=== Sync Connection Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to sync campaign data';
      if (err instanceof Error) {
        if (err.message.includes('Authentication') || err.message.includes('auth')) {
          userMessage = 'Please reconnect your Amazon account and try again.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else {
          userMessage = err.message;
        }
      }
      
      toast({
        title: "Sync Failed",
        description: userMessage,
        variant: "destructive",
      });
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      console.log('=== Deleting Connection ===');
      console.log('Connection ID:', connectionId);
      
      const { error } = await (supabase as any)
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('=== Delete Error ===');
        console.error('Error details:', error);
        throw error;
      }

      toast({
        title: "Connection Removed",
        description: "Amazon connection has been removed successfully.",
      });

      await refreshConnections();
    } catch (err) {
      console.error('=== Delete Connection Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to remove connection';
      if (err instanceof Error) {
        userMessage = err.message;
      }
      
      toast({
        title: "Delete Failed",
        description: userMessage,
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    const cacheKey = `${code}-${state}`;
    
    console.log('=== OAuth Callback Started ===');
    
    if (oauthCallbackCache.current.has(cacheKey)) {
      console.log('=== Duplicate Callback Detected ===');
      try {
        const result = await oauthCallbackCache.current.get(cacheKey);
        return result;
      } catch (err) {
        oauthCallbackCache.current.delete(cacheKey);
        throw err;
      }
    }

    try {
      const callbackPromise = supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      }).then(async ({ data, error }) => {
        console.log('=== OAuth Callback Response ===');
        console.log('Data:', data);
        console.log('Error:', error);

        if (error) {
          console.error('=== OAuth Callback Error ===');
          console.error('Error details:', error);
          
          let userMessage = 'Failed to process Amazon callback';
          if (typeof error === 'object' && error.message) {
            userMessage = error.message;
          } else if (typeof error === 'string') {
            userMessage = error;
          }
          
          throw new Error(userMessage);
        }

        if (data?.error || !data?.success) {
          console.error('=== OAuth Callback Returned Error ===');
          console.error('Server error:', data?.error);
          throw new Error(data?.details || data?.error || 'Callback processing failed');
        }

        console.log('=== Refreshing Connections After Callback ===');
        await fetchConnections();
        
        const result = { 
          profileCount: data?.profileCount || 0,
          message: data?.message || 'Connection successful'
        };
        console.log('=== OAuth Callback Success ===');
        return result;
      });

      oauthCallbackCache.current.set(cacheKey, callbackPromise);
      const result = await callbackPromise;
      oauthCallbackCache.current.delete(cacheKey);
      
      return result;
    } catch (err) {
      console.error('=== OAuth Callback Process Error ===');
      console.error('Error:', err);
      
      oauthCallbackCache.current.delete(cacheKey);
      throw err;
    }
  };

  return {
    connections,
    loading,
    error,
    refreshConnections,
    initiateConnection,
    syncConnection,
    deleteConnection,
    handleOAuthCallback,
  };
};
