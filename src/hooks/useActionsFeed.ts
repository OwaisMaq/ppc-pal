import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ActionItem {
  id: string;
  action_type: string;
  payload: any;
  status: 'queued' | 'applied' | 'failed' | 'skipped';
  created_at: string;
  applied_at?: string;
  error?: string;
  rule_id: string;
}

export const useActionsFeed = (limit: number = 20) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchActions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('action_queue')
        .select(`
          id,
          action_type,
          payload,
          status,
          created_at,
          applied_at,
          error,
          rule_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActions((data || []) as ActionItem[]);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, limit]);

  return { actions, loading, refetch: fetchActions };
};
