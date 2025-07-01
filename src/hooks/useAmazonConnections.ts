
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnections = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const formattedConnections: AmazonConnection[] = (data || []).map(conn => ({
        id: conn.id,
        status: conn.status === 'active' ? 'connected' : 'disconnected',
        profileName: conn.profile_name || 'Amazon Profile',
        connectedAt: conn.created_at,
        marketplace_id: conn.marketplace_id,
        profile_id: conn.profile_id,
        profile_name: conn.profile_name,
        last_sync_at: conn.last_sync_at
      }));

      setConnections(formattedConnections);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const refreshConnections = async () => {
    await fetchConnections();
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('Initiating Amazon connection with redirect URI:', redirectUri);
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri }
      });

      if (error) throw error;

      if (data?.authUrl) {
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
      
      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId }
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: "Campaign data sync has been initiated.",
      });

      await refreshConnections();
    } catch (err) {
      console.error('Error syncing connection:', err);
      toast({
        title: "Sync Failed",
        description: "Failed to sync campaign data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
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
    try {
      console.log('Handling OAuth callback:', code, state);
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      });

      if (error) throw error;

      await refreshConnections();
      
      return { profileCount: data?.profileCount || 0 };
    } catch (err) {
      console.error('Error handling OAuth callback:', err);
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
