import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OptimizationResult {
  keyword: string;
  suggestion: string;
  score: number;
}

export const useOptimizationEngine = () => {
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const optimizeKeywords = async (keywords: string) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to optimize keywords.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setOptimizations([]);

    try {
      const { data, error } = await supabase.functions.invoke('keyword-optimizer', {
        body: { keywords }
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw new Error(error.message);
      }

      if (data && Array.isArray(data)) {
        setOptimizations(data);
      } else {
        console.warn("Unexpected data format:", data);
        throw new Error("Unexpected data format received from optimizer.");
      }

      toast({
        title: "Optimization complete",
        description: "Your keywords have been successfully optimized.",
      });

    } catch (err: any) {
      console.error("Error during keyword optimization:", err);
      toast({
        title: "Optimization failed",
        description: err.message || "Failed to optimize keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    optimizations,
    optimizeKeywords,
  };
};
