
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OptimizationResult } from '@/lib/amazon/types';

export const useOptimizationEngine = () => {
  const { user } = useAuth();
  const { checkCanOptimize, incrementUsage, refreshSubscription } = useSubscription();
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runOptimization = async (
    connectionId: string, 
    options?: {
      attributionWindow?: '7d' | '14d';
      optimizationType?: 'full' | 'keywords' | 'bids' | 'budgets';
      focusAreas?: string[];
    }
  ): Promise<string | null> => {
    if (!user) return null;

    // Check if user can optimize
    const canOptimize = await checkCanOptimize();
    if (!canOptimize) {
      toast.error("You've reached your optimization limit. Please upgrade or wait for next month.");
      return null;
    }

    try {
      setLoading(true);
      
      // Check connection health before optimization
      const { data: connection } = await supabase
        .from('amazon_connections')
        .select('health_status, last_sync_at')
        .eq('id', connectionId)
        .single();

      if (connection?.health_status === 'degraded') {
        toast.warning('Connection has health issues. Consider running a health check first.');
      }

      // Check if data is recent enough for optimization
      if (connection?.last_sync_at) {
        const lastSync = new Date(connection.last_sync_at);
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 24) {
          toast.warning('Data is more than 24 hours old. Consider syncing first for best results.');
        }
      }
      
      // Create optimization batch with enhanced options
      const { data: batchData, error: batchError } = await supabase.rpc('create_optimization_batch', {
        user_uuid: user.id,
        connection_uuid: connectionId
      });

      if (batchError) throw batchError;

      const optimizationId = batchData;
      
      // Call enhanced optimization edge function
      const { data, error } = await supabase.functions.invoke('run-optimization', {
        body: { 
          connectionId, 
          optimizationId,
          options: {
            attributionWindow: options?.attributionWindow || '14d',
            optimizationType: options?.optimizationType || 'full',
            focusAreas: options?.focusAreas || ['keywords', 'bids', 'budgets'],
            useEnhancedMetrics: true
          }
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // Increment usage count
      await incrementUsage();
      await refreshSubscription();
      
      const message = options?.optimizationType === 'full' 
        ? 'Enhanced AI optimization started successfully!' 
        : `${options?.optimizationType} optimization started successfully!`;
      
      toast.success(message);
      return optimizationId;
    } catch (error) {
      console.error('Error running enhanced optimization:', error);
      toast.error('Failed to start optimization: ' + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchOptimizations = async (connectionId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('optimization_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOptimizations(data || []);
    } catch (error) {
      console.error('Error fetching optimizations:', error);
      toast.error('Failed to load optimization results');
    } finally {
      setLoading(false);
    }
  };

  const getOptimizationStatus = async (optimizationId: string): Promise<OptimizationResult | null> => {
    try {
      const { data, error } = await supabase
        .from('optimization_results')
        .select('*')
        .eq('id', optimizationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching optimization status:', error);
      return null;
    }
  };

  return {
    optimizations,
    loading,
    runOptimization,
    fetchOptimizations,
    getOptimizationStatus
  };
};
