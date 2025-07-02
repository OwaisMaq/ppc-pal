
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
}

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const oauthCallbackCache = useRef<Map<string, Promise<any>>>(new Map());

  const fetchConnections = async () => {
    if (!user) {
      console.log('No user found, skipping connection fetch');
      setLoading(false);
      return;
    }

    console.log('=== Fetching Amazon connections ===');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    setLoading(true);

    try {
      // Use any type to bypass TypeScript issues with new tables
      const { data, error, count } = await (supabase as any)
        .from('amazon_connections')
        .select(`
          *,
          campaigns(count)
        `, { count: 'exact' })
        .eq('user_id', user.id);

      console.log('Raw database query result:', {
        data,
        error,
        count,
        dataLength: data?.length
      });

      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Raw connection data from DB:', data);

      const formattedConnections: AmazonConnection[] = (data || []).map((conn: any, index: number) => {
        console.log(`Processing connection ${index + 1}:`, {
          id: conn.id,
          user_id: conn.user_id,
          profile_id: conn.profile_id,
          profile_name: conn.profile_name,
          status: conn.status,
          created_at: conn.created_at,
          marketplace_id: conn.marketplace_id,
          campaigns: conn.campaigns
        });
        
        const campaignCount = conn.campaigns?.length || 0;
        const hasBeenSynced = conn.last_sync_at && campaignCount > 0;
        const isActive = conn.status === 'active';
        const needsSync = isActive && (!conn.last_sync_at || campaignCount === 0);
        
        // Determine connection status based on profile availability and sync status
        let connectionStatus: 'connected' | 'disconnected' | 'error' | 'setup_required';
        
        if (!isActive) {
          connectionStatus = 'error';
        } else if (!conn.profile_id) {
          connectionStatus = 'setup_required';
        } else if (needsSync) {
          connectionStatus = 'setup_required'; // Needs data sync
        } else {
          connectionStatus = 'connected';
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
          needs_sync: needsSync
        };
        
        console.log(`Formatted connection ${index + 1}:`, formatted);
        return formatted;
      });

      console.log('=== Final formatted connections ===');
      console.log('Total connections:', formattedConnections.length);
      console.log('Connections:', formattedConnections);
      
      setConnections(formattedConnections);
      setError(null);
    } catch (err) {
      console.error('=== Error fetching connections ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error object:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const refreshConnections = async () => {
    console.log('=== Manual refresh triggered ===');
    await fetchConnections();
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('Initiating Amazon connection with redirect URI:', redirectUri);
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri }
      });

      console.log('OAuth init response:', { data, error });

      if (error) throw error;

      if (data?.authUrl) {
        console.log('Redirecting to Amazon OAuth URL:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('Error initiating connection:', err);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Amazon connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const syncConnection = async (connectionId: string) => {
    try {
      console.log('Syncing connection:', connectionId);
      
      // Show loading toast
      toast({
        title: "Sync Started",
        description: "Fetching your campaign data from Amazon. This may take a few moments...",
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data?.campaignCount || 0} campaigns from Amazon.`,
      });

      await refreshConnections();
    } catch (err) {
      console.error('Error syncing connection:', err);
      toast({
        title: "Sync Failed",
        description: "Failed to sync campaign data. Please check your Amazon account has active campaigns and try again.",
        variant: "destructive",
      });
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      console.log('Deleting connection:', connectionId);
      
      const { error } = await (supabase as any)
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Connection Removed",
        description: "Amazon connection has been removed.",
      });

      await refreshConnections();
    } catch (err) {
      console.error('Error deleting connection:', err);
      toast({
        title: "Delete Failed",
        description: "Failed to remove connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    const cacheKey = `${code}-${state}`;
    
    // Check if we're already processing this exact callback
    if (oauthCallbackCache.current.has(cacheKey)) {
      console.log('OAuth callback already in progress for this code/state, waiting for existing request...');
      return await oauthCallbackCache.current.get(cacheKey);
    }

    try {
      console.log('Handling OAuth callback with code:', code, 'state:', state);
      
      // Create and cache the promise to prevent duplicate requests
      const callbackPromise = supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      }).then(async ({ data, error }) => {
        console.log('OAuth callback response:', { data, error });

        if (error) throw error;

        // Force refresh connections after successful callback
        console.log('OAuth callback successful, refreshing connections...');
        await fetchConnections();
        
        return { profileCount: data?.profileCount || 0 };
      });

      // Cache the promise
      oauthCallbackCache.current.set(cacheKey, callbackPromise);

      const result = await callbackPromise;
      
      // Clean up the cache after successful completion
      oauthCallbackCache.current.delete(cacheKey);
      
      return result;
    } catch (err) {
      console.error('Error handling OAuth callback:', err);
      // Clean up the cache on error
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
