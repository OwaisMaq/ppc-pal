import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OptimizationResult } from '@/lib/amazon/types';

export const useOptimizationEngine = () => {
  const { user } = useAuth();
  const { checkCanOptimize, incrementUsage, refreshSubscription } = useSubscription();
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runOptimization = async (connectionId: string): Promise<string | null> => {
    if (!user) return null;

    // Check if user can optimize
    const canOptimize = await checkCanOptimize();
    if (!canOptimize) {
      toast.error("You've reached your optimization limit. Please upgrade or wait for next month.");
      return null;
    }

    try {
      setLoading(true);
      
      // Create optimization batch
      const { data: batchData, error: batchError } = await supabase.rpc('create_optimization_batch', {
        user_uuid: user.id,
        connection_uuid: connectionId
      });

      if (batchError) throw batchError;

      const optimizationId = batchData;
      
      // Call edge function to run AI optimization
      const { data, error } = await supabase.functions.invoke('run-optimization', {
        body: { 
          connectionId, 
          optimizationId 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // Increment usage count
      await incrementUsage();
      await refreshSubscription();
      
      toast.success('AI optimization started successfully!');
      return optimizationId;
    } catch (error) {
      console.error('Error running optimization:', error);
      toast.error('Failed to start optimization');
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
