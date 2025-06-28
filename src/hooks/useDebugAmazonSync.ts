
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DebugStep {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  details?: string;
  data?: any;
}

export const useDebugAmazonSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addDebugStep = (step: string, status: DebugStep['status'], details?: string, data?: any) => {
    setDebugSteps(prev => [...prev, { step, status, details, data }]);
    console.log(`🔍 DEBUG: ${step} - ${status}`, details, data);
  };

  const runDebugSync = async () => {
    if (!user) return;
    
    setIsDebugging(true);
    setDebugSteps([]);
    
    try {
      // Step 1: Check database connections
      addDebugStep('Checking Amazon connections in database', 'pending');
      
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connectionsError) {
        addDebugStep('Database connection check', 'error', connectionsError.message);
        return;
      }

      addDebugStep('Database connection check', 'success', `Found ${connections?.length || 0} connections`, connections);

      if (!connections?.length) {
        addDebugStep('No connections found', 'error', 'User has no Amazon connections in database');
        return;
      }

      // Step 2: Check campaigns table
      addDebugStep('Checking campaigns in database', 'pending');
      
      const connectionIds = connections.map(c => c.id);
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .in('connection_id', connectionIds);

      if (campaignsError) {
        addDebugStep('Database campaigns check', 'error', campaignsError.message);
      } else {
        addDebugStep('Database campaigns check', 'success', `Found ${campaigns?.length || 0} campaigns in database`, {
          totalCampaigns: campaigns?.length || 0,
          apiCampaigns: campaigns?.filter(c => c.data_source === 'api').length || 0,
          simulatedCampaigns: campaigns?.filter(c => c.data_source !== 'api').length || 0
        });
      }

      // Step 3: Test each connection with Amazon API
      for (const connection of connections) {
        await testAmazonConnection(connection);
      }

    } catch (error) {
      addDebugStep('Debug sync failed', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsDebugging(false);
    }
  };

  const testAmazonConnection = async (connection: any) => {
    addDebugStep(`Testing connection ${connection.profile_id}`, 'pending');
    
    try {
      // Test the sync endpoint directly
      const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-amazon-data', {
        body: { 
          connectionId: connection.id,
          debugMode: true 
        }
      });

      if (syncError) {
        addDebugStep(`Sync failed for ${connection.profile_id}`, 'error', syncError.message);
      } else {
        addDebugStep(`Sync completed for ${connection.profile_id}`, 'success', 'Check logs for detailed results', syncResult);
      }

    } catch (error) {
      addDebugStep(`Connection test failed for ${connection.profile_id}`, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const clearDebugSteps = () => {
    setDebugSteps([]);
  };

  return {
    debugSteps,
    isDebugging,
    runDebugSync,
    clearDebugSteps
  };
};
