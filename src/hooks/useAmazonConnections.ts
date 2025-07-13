
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

      console.log('Calling amazon-oauth callback...');
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'callback', code, state },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      console.log('Callback response:', { data, error });

      if (error) {
        console.error('Callback error:', error);
        throw error;
      }
      
      console.log('Connection successful, refreshing connections...');
      toast.success('Amazon account connected successfully!');
      await fetchConnections();
      return data;
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
