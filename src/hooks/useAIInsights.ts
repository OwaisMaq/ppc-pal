import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIInsight {
  type: 'bid_adjustment' | 'keyword_suggestion' | 'negative_keyword' | 'budget_change';
  campaign: string;
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface AIInsightsResponse {
  insights: AIInsight[];
  strategy: string;
  autoApply: boolean;
}

export const useAIInsights = () => {
  const queryClient = useQueryClient();
  const [autoApply, setAutoApply] = useState(
    localStorage.getItem('ai_auto_apply') === 'true'
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-insights');
      
      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('Payment required. Please add credits to continue.');
        }
        throw error;
      }
      
      return data as AIInsightsResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const toggleAutoApply = useMutation({
    mutationFn: async (enabled: boolean) => {
      // For now, we'll just store this preference in localStorage
      // In the future, this can be persisted to a database table
      localStorage.setItem('ai_auto_apply', String(enabled));
      setAutoApply(enabled);
      return enabled;
    },
    onSuccess: (enabled) => {
      toast.success(enabled ? 'Auto-apply enabled' : 'Auto-apply disabled');
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
    onError: (error) => {
      console.error('Error toggling auto-apply:', error);
      toast.error('Failed to update auto-apply setting');
    },
  });

  return {
    insights: data?.insights || [],
    strategy: data?.strategy || '',
    autoApply,
    isLoading,
    error,
    toggleAutoApply: toggleAutoApply.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
  };
};
