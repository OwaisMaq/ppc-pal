
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AmazonConnection } from '@/lib/amazon/types';

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "Failed to load Amazon connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateConnection = async (redirectUri: string) => {
    try {
      console.log('Starting Amazon OAuth flow...');
      
      // Call edge function to initiate Amazon OAuth
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'initiate', redirectUri },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log('OAuth URL generated, redirecting to Amazon...');
      
      // Redirect to Amazon OAuth URL
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating connection:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Amazon connection. Please check your API credentials.",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      console.log('Processing OAuth callback...');
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth', {
        body: { action: 'callback', code, state },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Amazon account connected successfully! Found ${data.profileCount} advertising profiles.`,
      });
      await fetchConnections();
      return data;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast({
        title: "Error",
        description: "Failed to complete Amazon connection",
        variant: "destructive",
      });
    }
  };

  const syncConnection = async (connectionId: string) => {
    try {
      console.log('Starting data sync for connection:', connectionId);
      
      const { error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Campaign data sync started! This may take a few minutes.",
      });
      await fetchConnections();
    } catch (error) {
      console.error('Error syncing connection:', error);
      toast({
        title: "Error",
        description: "Failed to sync Amazon data",
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
        title: "Success",
        description: "Amazon connection deleted successfully!",
      });
      await fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Error",
        description: "Failed to delete Amazon connection",
        variant: "destructive",
      });
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
