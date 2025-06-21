
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AmazonConnection } from '@/lib/amazon/types';
import { amazonConnectionService } from '@/services/amazonConnectionService';
import { useAmazonOAuth } from './useAmazonOAuth';
import { useConnectionOperations } from './useConnectionOperations';

export const useAmazonConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { initiateConnection, handleOAuthCallback } = useAmazonOAuth();
  const { syncConnection: syncConnectionOp, deleteConnection: deleteConnectionOp } = useConnectionOperations();

  useEffect(() => {
    if (user) {
      console.log('Fetching connections for user:', user.id);
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await amazonConnectionService.fetchConnections();
      setConnections(data);
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

  const syncConnection = async (connectionId: string) => {
    await syncConnectionOp(connectionId, fetchConnections);
  };

  const deleteConnection = async (connectionId: string) => {
    await deleteConnectionOp(connectionId, fetchConnections);
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
