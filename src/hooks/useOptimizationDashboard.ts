
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OptimizationResult } from '@/lib/amazon/types';

export const useOptimizationDashboard = () => {
  const { user } = useAuth();
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOptimizations = async (connectionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('optimization_results')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOptimizations(data || []);
    } catch (error) {
      console.error('Error fetching optimizations:', error);
      toast({
        title: "Error",
        description: "Failed to load optimization history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async (connectionId: string) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to run optimizations.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create optimization batch
      const { data: optimizationResult, error: createError } = await supabase
        .rpc('create_optimization_batch', {
          user_uuid: user.id,
          connection_uuid: connectionId
        });

      if (createError) throw createError;

      // Call the optimization function
      const { data, error } = await supabase.functions.invoke('run-optimization', {
        body: { 
          connectionId, 
          optimizationId: optimizationResult 
        }
      });

      if (error) throw error;

      toast({
        title: "Optimization started",
        description: "Your optimization is running in the background.",
      });

    } catch (error: any) {
      console.error('Error running optimization:', error);
      toast({
        title: "Optimization failed",
        description: error.message || "Failed to start optimization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    optimizations,
    loading,
    runOptimization,
    fetchOptimizations,
  };
};
