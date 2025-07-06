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
      console.log('Skipping connection fetch - user not authenticated');
      setLoading(false);
      return;
    }

    if (fetchingRef.current) {
      console.log('=== Fetch Already in Progress ===');
      console.log('Skipping duplicate fetch request');
      return;
    }

    fetchingRef.current = true;

    console.log('=== Fetching Amazon Connections ===');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    console.log('Timestamp:', new Date().toISOString());
    setLoading(true);

    try {
      console.log('=== Database Query Starting ===');
      // Use any type to bypass TypeScript issues with new tables
      const { data, error, count } = await (supabase as any)
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
      console.log('Count:', count);
      
      if (error) {
        console.error('=== Supabase Query Error ===');
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        console.error('Full error object:', error);
        throw error;
      }

      if (!data) {
        console.log('=== No Data Returned ===');
        console.log('Query returned null/undefined data');
        setConnections([]);
        setError(null);
        return;
      }

      console.log('=== Processing Connection Data ===');
      console.log('Raw connection data from DB:', data);

      const formattedConnections: AmazonConnection[] = data.map((conn: any, index: number) => {
        console.log(`=== Processing Connection ${index + 1} ===`);
        console.log('Connection ID:', conn.id);
        console.log('User ID:', conn.user_id);
        console.log('Profile ID:', conn.profile_id);
        console.log('Profile Name:', conn.profile_name);
        console.log('Status:', conn.status);
        console.log('Created At:', conn.created_at);
        console.log('Marketplace ID:', conn.marketplace_id);
        console.log('Last Sync At:', conn.last_sync_at);
        console.log('Campaigns Data:', conn.campaigns);
        
        const campaignCount = Array.isArray(conn.campaigns) ? conn.campaigns.length : 0;
        const hasBeenSynced = conn.last_sync_at && campaignCount > 0;
        const isActive = conn.status === 'active';
        const needsSync = isActive && (!conn.last_sync_at || campaignCount === 0);
        
        console.log('Computed values:');
        console.log('- Campaign count:', campaignCount);
        console.log('- Has been synced:', hasBeenSynced);
        console.log('- Is active:', isActive);
        console.log('- Needs sync:', needsSync);
        
        // Determine connection status based on profile availability and sync status
        let connectionStatus: 'connected' | 'disconnected' | 'error' | 'setup_required';
        let setupRequiredReason: string | undefined;
        
        if (!isActive) {
          connectionStatus = 'error';
          console.log('Status determination: error (not active)');
        } else if (!conn.profile_id || conn.profile_id === 'setup_required_no_profiles_found') {
          connectionStatus = 'setup_required';
          setupRequiredReason = 'no_advertising_profiles';
          console.log('Status determination: setup_required (no valid profile)');
        } else if (needsSync) {
          connectionStatus = 'setup_required'; // Needs data sync
          setupRequiredReason = 'needs_sync';
          console.log('Status determination: setup_required (needs sync)');
        } else {
          connectionStatus = 'connected';
          console.log('Status determination: connected');
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
          needs_sync: needsSync,
          setup_required_reason: setupRequiredReason
        };
        
        console.log(`=== Formatted Connection ${index + 1} ===`);
        console.log('Final formatted connection:', formatted);
        return formatted;
      });

      console.log('=== Final Processing Results ===');
      console.log('Total connections processed:', formattedConnections.length);
      console.log('Connection statuses:', formattedConnections.map(c => ({ id: c.id, status: c.status })));
      console.log('All formatted connections:', formattedConnections);
      
      setConnections(formattedConnections);
      setError(null);
      
      console.log('=== Fetch Connections Completed Successfully ===');
    } catch (err) {
      console.error('=== Fetch Connections Error ===');
      console.error('Error type:', typeof err);
      console.error('Error name:', err instanceof Error ? err.name : 'Unknown');
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(errorMessage);
      setConnections([]);
      
      // Show user-friendly error toast
      toast({
        title: "Connection Error",
        description: "Failed to load your Amazon connections. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      console.log('=== Fetch Connections Process Ended ===');
    }
  };

  useEffect(() => {
    console.log('=== useEffect Triggered ===');
    console.log('User changed:', !!user);
    fetchConnections();
  }, [user]);

  const refreshConnections = async () => {
    console.log('=== Manual Refresh Triggered ===');
    console.log('Timestamp:', new Date().toISOString());
    await fetchConnections();
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('=== Initiating Amazon Connection ===');
      console.log('Redirect URI:', redirectUri);
      console.log('User ID:', user?.id);
      console.log('Timestamp:', new Date().toISOString());
      
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
      console.log('Response timestamp:', new Date().toISOString());

      if (error) {
        console.error('=== OAuth Init Error ===');
        console.error('Error details:', error);
        
        // Extract user-friendly error message
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
        console.error('Server details:', data.details);
        throw new Error(data.details || data.error);
      }

      if (data?.authUrl) {
        console.log('=== Redirecting to Amazon ===');
        console.log('Auth URL received:', data.authUrl);
        console.log('Redirect timestamp:', new Date().toISOString());
        
        // Add a small delay to ensure logs are captured and UI updates
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 100);
      } else {
        console.error('=== No Auth URL Received ===');
        console.error('Data received:', data);
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
      console.log('Timestamp:', new Date().toISOString());
      
      // Show loading toast
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
        console.error('Server details:', data.details);
        
        // Handle specific error cases with improved messaging
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

      console.log('=== Delete Response ===');
      console.log('Error:', error);

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
    console.log('Code present:', !!code);
    console.log('State:', state);
    console.log('Cache key:', cacheKey);
    
    // Check if we're already processing this exact callback
    if (oauthCallbackCache.current.has(cacheKey)) {
      console.log('=== Duplicate Callback Detected ===');
      console.log('OAuth callback already in progress for this code/state, waiting for existing request...');
      try {
        const result = await oauthCallbackCache.current.get(cacheKey);
        console.log('=== Duplicate Callback Resolved ===');
        console.log('Result:', result);
        return result;
      } catch (err) {
        console.error('=== Duplicate Callback Error ===');
        console.error('Error:', err);
        // Remove failed promise from cache and retry
        oauthCallbackCache.current.delete(cacheKey);
        throw err;
      }
    }

    try {
      console.log('=== Processing New OAuth Callback ===');
      
      // Create and cache the promise to prevent duplicate requests
      const callbackPromise = supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      }).then(async ({ data, error }) => {
        console.log('=== OAuth Callback Response ===');
        console.log('Data:', data);
        console.log('Error:', error);
        console.log('Response timestamp:', new Date().toISOString());

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
          console.error('Server details:', data?.details);
          throw new Error(data?.details || data?.error || 'Callback processing failed');
        }

        // Force refresh connections after successful callback
        console.log('=== Refreshing Connections After Callback ===');
        await fetchConnections();
        
        const result = { 
          profileCount: data?.profileCount || 0,
          message: data?.message || 'Connection successful'
        };
        console.log('=== OAuth Callback Success ===');
        console.log('Final result:', result);
        return result;
      });

      // Cache the promise
      oauthCallbackCache.current.set(cacheKey, callbackPromise);
      console.log('=== Callback Promise Cached ===');

      const result = await callbackPromise;
      
      // Clean up the cache after successful completion
      oauthCallbackCache.current.delete(cacheKey);
      console.log('=== Callback Cache Cleaned Up ===');
      
      return result;
    } catch (err) {
      console.error('=== OAuth Callback Process Error ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error:', err);
      
      // Clean up the cache on error
      oauthCallbackCache.current.delete(cacheKey);
      console.log('=== Callback Cache Cleaned Up After Error ===');
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
