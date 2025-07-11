
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { AmazonConnectionOperations } from '@/services/amazonConnectionOperations';
import { AmazonSyncService } from '@/services/amazonSyncService';
import { AmazonOAuthService } from '@/services/amazonOAuthService';
import { determineConnectionStatus } from '@/utils/amazonConnectionValidation';

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
  token_expires_at: string;
}

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast: shadcnToast } = useToast();
  const fetchingRef = useRef(false);

  // Initialize services - pass shadcn toast to operations, sonner toast to sync service
  const connectionOperations = new AmazonConnectionOperations(shadcnToast);
  const syncService = new AmazonSyncService(toast, connectionOperations);
  const oauthService = new AmazonOAuthService(shadcnToast);

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
          
          const { connectionStatus, setupRequiredReason, needsSync, campaignCount } = 
            await determineConnectionStatus(conn, connectionOperations.updateConnectionStatus.bind(connectionOperations));
          
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
            setup_required_reason: setupRequiredReason,
            token_expires_at: conn.token_expires_at
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
      
      shadcnToast({
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
    await connectionOperations.initiateConnection(redirectUri);
  };

  const syncConnection = async (connectionId: string) => {
    await syncService.syncConnection(connectionId, refreshConnections);
  };

  const deleteConnection = async (connectionId: string) => {
    const success = await connectionOperations.deleteConnection(connectionId);
    if (success) {
      await refreshConnections();
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    return await oauthService.handleOAuthCallback(code, state, fetchConnections, syncConnection);
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
