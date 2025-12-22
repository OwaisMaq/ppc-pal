import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ActionItem {
  id: string;
  action_type: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'applied' | 'failed' | 'skipped';
  created_at: string;
  applied_at?: string;
  error?: string;
  rule_id: string | null;
  profile_id: string;
  amazon_api_response?: Record<string, unknown>;
  user_id?: string;
}

export interface ActionStats {
  total: number;
  applied: number;
  queued: number;
  failed: number;
  skipped: number;
}

export const useActionsFeed = (limit: number = 20, statusFilter?: string) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState<ActionStats>({ total: 0, applied: 0, queued: 0, failed: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch counts for each status
      const statuses = ['applied', 'queued', 'failed', 'skipped'];
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const { count, error } = await supabase
            .from('action_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', status);
          
          if (error) throw error;
          return { status, count: count || 0 };
        })
      );

      const newStats: ActionStats = {
        total: counts.reduce((sum, c) => sum + c.count, 0),
        applied: counts.find(c => c.status === 'applied')?.count || 0,
        queued: counts.find(c => c.status === 'queued')?.count || 0,
        failed: counts.find(c => c.status === 'failed')?.count || 0,
        skipped: counts.find(c => c.status === 'skipped')?.count || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching action stats:', error);
    }
  }, [user]);

  const fetchActions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('action_queue')
        .select(`
          id,
          action_type,
          payload,
          status,
          created_at,
          applied_at,
          error,
          rule_id,
          profile_id,
          amazon_api_response,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply status filter if provided
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActions((data || []) as ActionItem[]);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, limit, statusFilter]);

  useEffect(() => {
    fetchActions();
    fetchStats();
    
    // Subscribe to real-time updates with unique channel name
    const channelName = `action_queue_changes_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_queue'
        },
        () => {
          fetchActions();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActions, fetchStats]);

  return { actions, stats, loading, refetch: fetchActions };
};
