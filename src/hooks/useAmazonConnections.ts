
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
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('amazon_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      // Call edge function to initiate Amazon OAuth
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'initiate', redirectUri },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      // Redirect to Amazon OAuth URL
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating connection:', error);
      toast.error('Failed to initiate Amazon connection');
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'callback', code, state },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast.success('Amazon account connected successfully!');
      await fetchConnections();
      return data;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast.error('Failed to complete Amazon connection');
    }
  };

  const syncConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast.success('Data sync initiated successfully!');
      await fetchConnections();
    } catch (error) {
      console.error('Error syncing connection:', error);
      toast.error('Failed to sync Amazon data');
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
    refreshConnections: fetchConnections
  };
};
