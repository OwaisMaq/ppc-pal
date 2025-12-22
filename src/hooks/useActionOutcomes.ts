import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ActionOutcome {
  id: string;
  action_id: string;
  profile_id: string;
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number> | null;
  metric_delta: Record<string, number> | null;
  outcome_score: number | null;
  outcome_status: 'pending' | 'positive' | 'neutral' | 'negative' | 'inconclusive';
  created_at: string;
  before_captured_at: string;
  after_scheduled_at: string;
  after_captured_at: string | null;
}

export interface OutcomeStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  pending: number;
  averageScore: number;
}

export const useActionOutcomes = (actionId?: string) => {
  const [outcomes, setOutcomes] = useState<ActionOutcome[]>([]);
  const [stats, setStats] = useState<OutcomeStats>({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    pending: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOutcomes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('action_outcomes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionId) {
        query = query.eq('action_id', actionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Type assertion since we know the structure
      const typedData = (data || []) as unknown as ActionOutcome[];
      setOutcomes(typedData);

      // Calculate stats
      const positive = typedData.filter(o => o.outcome_status === 'positive').length;
      const neutral = typedData.filter(o => o.outcome_status === 'neutral').length;
      const negative = typedData.filter(o => o.outcome_status === 'negative').length;
      const pending = typedData.filter(o => o.outcome_status === 'pending').length;
      
      const scoredOutcomes = typedData.filter(o => o.outcome_score !== null);
      const averageScore = scoredOutcomes.length > 0
        ? scoredOutcomes.reduce((sum, o) => sum + (o.outcome_score || 0), 0) / scoredOutcomes.length
        : 0;

      setStats({
        total: typedData.length,
        positive,
        neutral,
        negative,
        pending,
        averageScore: Math.round(averageScore * 100) / 100,
      });
    } catch (error) {
      console.error('Error fetching action outcomes:', error);
    } finally {
      setLoading(false);
    }
  }, [user, actionId]);

  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  return { outcomes, stats, loading, refetch: fetchOutcomes };
};
