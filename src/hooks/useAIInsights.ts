import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface ActionablePayload {
  action_type: string;
  payload: Record<string, unknown>;
  entity_id: string;
  entity_name: string;
  confidence: number;
  reason_code: string;
}

export interface AIInsight {
  id?: string;
  type: 'bid_adjustment' | 'keyword_suggestion' | 'negative_keyword' | 'budget_change';
  campaign: string;
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
  actionable?: ActionablePayload;
}

interface AIInsightsResponse {
  insights: AIInsight[];
  strategy: string;
  autoApply: boolean;
  autoAppliedCount?: number;
  autoAppliedInsights?: string[];
}

interface AISettings {
  auto_apply_enabled: boolean;
  auto_apply_max_impact: 'low' | 'medium' | 'high';
  auto_apply_min_confidence: number;
  auto_apply_action_types: string[];
}

const DEFAULT_SETTINGS: AISettings = {
  auto_apply_enabled: false,
  auto_apply_max_impact: 'low',
  auto_apply_min_confidence: 0.8,
  auto_apply_action_types: [],
};

export const useAIInsights = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  // Fetch user's AI settings
  const { data: settingsData } = useQuery({
    queryKey: ['ai-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching AI settings:', error);
      }
      
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settingsData) {
      setSettings({
        auto_apply_enabled: settingsData.auto_apply_enabled,
        auto_apply_max_impact: settingsData.auto_apply_max_impact as AISettings['auto_apply_max_impact'],
        auto_apply_min_confidence: settingsData.auto_apply_min_confidence,
        auto_apply_action_types: settingsData.auto_apply_action_types || [],
      });
    }
  }, [settingsData]);

  // Fetch insights from edge function
  const { data, isLoading, error, refetch: refetchInsights } = useQuery({
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
      
      const response = data as AIInsightsResponse;
      
      // Show toast if insights were auto-applied
      if (response.autoAppliedCount && response.autoAppliedCount > 0) {
        toast.success(`Auto-applied ${response.autoAppliedCount} high-confidence recommendation${response.autoAppliedCount !== 1 ? 's' : ''}`);
      }
      
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user,
  });

  // Fetch stored insights from database
  const { data: storedInsights } = useQuery({
    queryKey: ['ai-insights-stored', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching stored insights:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user,
  });

  // Toggle auto-apply setting
  const toggleAutoApply = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_ai_settings')
        .upsert({
          user_id: user.id,
          auto_apply_enabled: enabled,
          auto_apply_max_impact: settings.auto_apply_max_impact,
          auto_apply_min_confidence: settings.auto_apply_min_confidence,
          auto_apply_action_types: settings.auto_apply_action_types,
        }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSettings(prev => ({ ...prev, auto_apply_enabled: data.auto_apply_enabled }));
      toast.success(data.auto_apply_enabled ? 'Auto-apply enabled' : 'Auto-apply disabled');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
    onError: (error) => {
      console.error('Error toggling auto-apply:', error);
      toast.error('Failed to update auto-apply setting');
    },
  });

  // Approve an insight and queue it as an action
  const approveInsight = useCallback(async (insightId: string, profileId: string) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
    setIsApproving(insightId);
    
    try {
      // Find the insight from stored insights
      const insight = storedInsights?.find(i => i.id === insightId);
      if (!insight) {
        toast.error('Insight not found');
        return;
      }

      // Insert into action_queue
      const idempotencyKey = `ai_insight_${insightId}`;
      const { error: queueError } = await supabase
        .from('action_queue')
        .insert({
          action_type: insight.action_type,
          payload: insight.payload,
          profile_id: profileId,
          user_id: user.id,
          idempotency_key: idempotencyKey,
          status: 'queued',
        });

      if (queueError) {
        if (queueError.code === '23505') {
          toast.info('This action has already been queued');
        } else {
          throw queueError;
        }
      }

      // Update insight status
      const { error: updateError } = await supabase
        .from('ai_insights')
        .update({ status: 'approved', applied_at: new Date().toISOString() })
        .eq('id', insightId);

      if (updateError) throw updateError;

      toast.success('Action queued for execution');
      queryClient.invalidateQueries({ queryKey: ['ai-insights-stored'] });
      queryClient.invalidateQueries({ queryKey: ['action-queue'] });
      
    } catch (error) {
      console.error('Error approving insight:', error);
      toast.error('Failed to queue action');
    } finally {
      setIsApproving(null);
    }
  }, [user, storedInsights, queryClient]);

  // Reject an insight
  const rejectInsight = useCallback(async (insightId: string) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ status: 'rejected' })
        .eq('id', insightId);

      if (error) throw error;

      toast.success('Insight dismissed');
      queryClient.invalidateQueries({ queryKey: ['ai-insights-stored'] });
      
    } catch (error) {
      console.error('Error rejecting insight:', error);
      toast.error('Failed to dismiss insight');
    }
  }, [user, queryClient]);

  // Merge fresh insights from API with stored insights
  const mergedInsights: AIInsight[] = (data?.insights || []).map(insight => {
    const stored = storedInsights?.find(
      s => s.entity_id === insight.actionable?.entity_id && 
           s.action_type === insight.actionable?.action_type
    );
    return {
      ...insight,
      id: stored?.id,
      status: stored?.status as AIInsight['status'] || 'pending',
    };
  });

  return {
    insights: mergedInsights,
    storedInsights: storedInsights || [],
    strategy: data?.strategy || '',
    autoApply: settings.auto_apply_enabled,
    autoAppliedCount: data?.autoAppliedCount || 0,
    autoAppliedInsights: data?.autoAppliedInsights || [],
    settings,
    isLoading,
    isApproving,
    error,
    toggleAutoApply: toggleAutoApply.mutate,
    approveInsight,
    rejectInsight,
    refetch: () => {
      refetchInsights();
      queryClient.invalidateQueries({ queryKey: ['ai-insights-stored'] });
    },
  };
};
