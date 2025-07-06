
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AmazonConnection {
  id: string;
  status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required';
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
  const { user, session } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const oauthCallbackCache = useRef<Map<string, Promise<any>>>(new Map());
  const fetchingRef = useRef(false);

  const updateConnectionStatus = async (connectionId: string, status: 'active' | 'error' | 'warning', reason?: string) => {
    try {
      console.log(`=== Updating Connection Status ===`);
      console.log('Connection ID:', connectionId);
      console.log('New status:', status);
      console.log('Reason:', reason);

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // If there's an error reason, we might want to store it
      if (reason && status === 'error') {
        console.log('Storing error reason for connection');
      }

      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (updateError) {
        console.error('Failed to update connection status:', updateError);
      } else {
        console.log('Connection status updated successfully');
      }
    } catch (err) {
      console.error('Error updating connection status:', err);
    }
  };

  const validateProfileConfiguration = (connection: any): { isValid: boolean; reason?: string } => {
    console.log('=== Validating Profile Configuration ===');
    console.log('Profile ID:', connection.profile_id);
    console.log('Profile Name:', connection.profile_name);

    if (!connection.profile_id) {
      return { isValid: false, reason: 'No profile ID configured' };
    }

    if (connection.profile_id === 'setup_required_no_profiles_found') {
      return { isValid: false, reason: 'No advertising profiles found' };
    }

    if (connection.profile_id.includes('error') || connection.profile_id === 'invalid') {
      return { isValid: false, reason: 'Invalid profile configuration' };
    }

    // Check if profile ID looks like a valid Amazon profile ID (should be numeric)
    if (!/^\d+$/.test(connection.profile_id)) {
      return { isValid: false, reason: 'Profile ID format appears invalid' };
    }

    console.log('Profile configuration is valid');
    return { isValid: true };
  };

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
      const { data, error } = await supabase
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

      const formattedConnections: AmazonConnection[] = await Promise.all(
        data.map(async (conn: any, index: number) => {
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
          
          // Use the database status as the primary source of truth
          let connectionStatus = conn.status;
          let setupRequiredReason: string | undefined;
          
          // Check token expiry first
          const tokenExpiry = new Date(conn.token_expires_at);
          const now = new Date();
          if (tokenExpiry <= now && connectionStatus !== 'expired') {
            connectionStatus = 'expired';
            setupRequiredReason = 'token_expired';
            console.log('Status: expired (token expired)');
            await updateConnectionStatus(conn.id, 'error', 'Token expired');
          } else {
            // For non-expired connections, interpret the status more intelligently
            switch (connectionStatus) {
              case 'active':
                // Active means successfully synced, regardless of campaign count
                console.log('Status: active (confirmed by database)');
                break;
                
              case 'setup_required':
                // Validate what kind of setup is required
                const profileValidation = validateProfileConfiguration(conn);
                if (!profileValidation.isValid) {
                  setupRequiredReason = 'no_advertising_profiles';
                  console.log('Status: setup_required (no advertising profiles)');
                } else if (!conn.last_sync_at) {
                  setupRequiredReason = 'needs_sync';
                  console.log('Status: setup_required (needs initial sync)');
                } else {
                  // Connection is properly configured, might just need a sync
                  connectionStatus = 'active';
                  console.log('Status: active (setup completed, sync successful)');
                }
                break;
                
              case 'warning':
                // Warning status - connection works but has issues
                console.log('Status: warning (connection has issues but functional)');
                break;
                
              case 'error':
                setupRequiredReason = 'connection_error';
                console.log('Status: error (connection has errors)');
                break;
                
              default:
                console.log('Status from DB:', connectionStatus);
            }
          }

          // Determine needs_sync flag
          const needsSync = !conn.last_sync_at || connectionStatus === 'setup_required';
          
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
          
          console.log('Final formatted connection:', formatted);
          return formatted;
        })
      );

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
      console.log('=== Sync Connection ===');
      console.log('Connection ID:', connectionId);
      console.log('Session present:', !!session);
      console.log('Access token present:', !!session?.access_token);
      
      // Check if we have a valid session
      if (!session?.access_token) {
        console.error('=== No Valid Session ===');
        toast({
          title: "Authentication Required",
          description: "Please sign in again to sync your Amazon connection.",
          variant: "destructive",
        });
        return;
      }
      
      // First, validate the connection exists and get its current state
      const { data: connectionData, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connectionData) {
        console.error('Connection not found:', connectionError);
        throw new Error('Connection not found or access denied');
      }

      console.log('Connection data before sync:', connectionData);

      // Validate profile before attempting sync
      const profileValidation = validateProfileConfiguration(connectionData);
      if (!profileValidation.isValid) {
        console.log('Profile validation failed, suggesting enhanced sync:', profileValidation.reason);
        
        toast({
          title: "Profile Setup Required",
          description: `${profileValidation.reason}. Try using "Enhanced Sync" to refresh your advertising profiles, or reconnect your account.`,
          variant: "destructive",
        });
        
        await updateConnectionStatus(connectionId, 'warning', profileValidation.reason);
        await refreshConnections();
        return;
      }
      
      toast({
        title: "Sync Started",
        description: "Fetching your campaign data from Amazon. Please wait...",
      });
      
      console.log('=== Calling Amazon Sync Function ===');
      console.log('Using access token:', session.access_token.substring(0, 20) + '...');
      
      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
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
        
        await updateConnectionStatus(connectionId, 'error', userMessage);
        throw new Error(userMessage);
      }

      if (data?.error) {
        console.error('=== Sync Returned Error ===');
        console.error('Server error:', data.error);
        
        if (data.requiresSetup || data.error === 'Profile setup required') {
          toast({
            title: "Amazon Advertising Setup Required",
            description: "Please set up your Amazon Advertising account at advertising.amazon.com first, then try 'Enhanced Sync' to import your campaigns.",
            variant: "destructive",
          });
          await updateConnectionStatus(connectionId, 'warning', 'Amazon Advertising setup required');
        } else if (data.requiresReconnection) {
          toast({
            title: "Reconnection Required",
            description: data.details || "Please reconnect your Amazon account to continue syncing",
            variant: "destructive",
          });
          await updateConnectionStatus(connectionId, 'error', 'Token expired or invalid');
        } else {
          toast({
            title: "Sync Failed",
            description: data.details || data.error,
            variant: "destructive",
          });
          await updateConnectionStatus(connectionId, 'error', data.error);
        }
        
        await refreshConnections();
        return;
      }

      // Handle successful sync responses
      const campaignCount = data?.campaignsSynced || data?.campaignCount || 0;
      const syncStatus = data?.syncStatus || 'success';
      
      if (syncStatus === 'success_no_campaigns' || campaignCount === 0) {
        // Successful sync but no campaigns found - this is normal and should be active
        await updateConnectionStatus(connectionId, 'active', 'Sync successful');
        toast({
          title: "Sync Complete",
          description: data?.message || "Sync completed successfully. No campaigns found in your Amazon account - this is normal for new advertising accounts.",
        });
      } else {
        // Successful sync with campaigns
        await updateConnectionStatus(connectionId, 'active', 'Sync successful');
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${campaignCount} campaigns from Amazon.`,
        });
      }

      await refreshConnections();
    } catch (err) {
      console.error('=== Sync Connection Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to sync campaign data';
      if (err instanceof Error) {
        if (err.message.includes('Authentication') || err.message.includes('auth')) {
          userMessage = 'Please reconnect your Amazon account and try again.';
          await updateConnectionStatus(connectionId, 'error', 'Authentication failed');
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
          await updateConnectionStatus(connectionId, 'warning', 'Network error');
        } else {
          userMessage = err.message;
          await updateConnectionStatus(connectionId, 'error', err.message);
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
    console.log('Cache key generated:', cacheKey.substring(0, 20) + '...');
    
    if (oauthCallbackCache.current.has(cacheKey)) {
      console.log('=== Duplicate Callback Detected - Using Cache ===');
      try {
        const result = await oauthCallbackCache.current.get(cacheKey);
        console.log('=== Cached Result Retrieved ===', result);
        return result;
      } catch (err) {
        console.error('=== Cached Result Failed ===', err);
        oauthCallbackCache.current.delete(cacheKey);
        throw err;
      }
    }

    console.log('=== Starting New OAuth Callback Process ===');

    try {
      const callbackPromise = supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      }).then(async ({ data, error }) => {
        console.log('=== OAuth Callback Response ===');
        console.log('Data present:', !!data);
        console.log('Error present:', !!error);
        console.log('Data keys:', data ? Object.keys(data) : 'none');

        if (error) {
          console.error('=== OAuth Callback Error ===');
          console.error('Error details:', error);
          
          let userMessage = 'Failed to process Amazon callback';
          let errorType = 'unknown_error';
          
          if (typeof error === 'object' && error.message) {
            userMessage = error.message;
            errorType = error.errorType || 'server_error';
          } else if (typeof error === 'string') {
            userMessage = error;
          }
          
          const enhancedError = new Error(userMessage);
          (enhancedError as any).errorType = errorType;
          (enhancedError as any).userAction = error.userAction || 'Please try connecting again';
          throw enhancedError;
        }

        if (data?.error || !data?.success) {
          console.error('=== OAuth Callback Returned Error ===');
          console.error('Server error:', data?.error);
          console.error('Error type:', data?.errorType);
          console.error('User action:', data?.userAction);
          
          const enhancedError = new Error(data?.error || 'Callback processing failed');
          (enhancedError as any).errorType = data?.errorType || 'callback_error';
          (enhancedError as any).userAction = data?.userAction || 'Please try connecting again';
          throw enhancedError;
        }

        console.log('=== Refreshing Connections After Callback ===');
        await fetchConnections();
        
        const result = { 
          profileCount: data?.profile_count || 0,
          message: data?.message || 'Connection successful',
          status: data?.status || 'active'
        };
        console.log('=== OAuth Callback Success ===', result);
        return result;
      });

      oauthCallbackCache.current.set(cacheKey, callbackPromise);
      
      try {
        const result = await callbackPromise;
        console.log('=== Final OAuth Result ===', result);
        return result;
      } finally {
        // Always clean up cache after processing
        setTimeout(() => {
          oauthCallbackCache.current.delete(cacheKey);
          console.log('=== OAuth Cache Entry Cleaned Up ===');
        }, 5000); // Keep for 5 seconds to handle rapid duplicate calls
      }
      
    } catch (err) {
      console.error('=== OAuth Callback Process Error ===');
      console.error('Error details:', err);
      
      oauthCallbackCache.current.delete(cacheKey);
      
      // Re-throw with enhanced error information
      if (err instanceof Error && (err as any).errorType) {
        throw err; // Already enhanced
      }
      
      const enhancedError = new Error(err instanceof Error ? err.message : 'Unknown callback error');
      (enhancedError as any).errorType = 'callback_processing_error';
      (enhancedError as any).userAction = 'Please try connecting again';
      throw enhancedError;
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
