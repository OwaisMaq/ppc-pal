import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface QueuedAction {
  id: string;
  action_type: string;
  status: string;
  payload: Record<string, unknown>;
  profile_id: string;
  rule_id: string;
  created_at: string;
  applied_at: string | null;
  amazon_request_id: string | null;
  amazon_api_response: Record<string, unknown> | null;
  error: string | null;
}

export function useActionQueue(profileId?: string) {
  const { user } = useAuth();
  const [actions, setActions] = useState<QueuedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('action_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setActions((data as QueuedAction[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching action queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch actions');
    } finally {
      setLoading(false);
    }
  }, [user, profileId]);

  const insertAction = useCallback(async (action: {
    action_type: string;
    payload: Record<string, unknown>;
    profile_id: string;
    rule_id?: string | null;
  }) => {
    if (!user) {
      toast.error('You must be logged in to queue actions');
      throw new Error('Not authenticated');
    }
    
    try {
      const idempotencyKey = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertData: {
        action_type: string;
        payload: Json;
        profile_id: string;
        idempotency_key: string;
        status: string;
        user_id: string;
        rule_id?: string;
      } = {
        action_type: action.action_type,
        payload: action.payload as Json,
        profile_id: action.profile_id,
        idempotency_key: idempotencyKey,
        status: 'queued',
        user_id: user.id
      };
      
      if (action.rule_id) {
        insertData.rule_id = action.rule_id;
      }
      
      const { data, error: insertError } = await supabase
        .from('action_queue')
        .insert([insertData])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      toast.success('Action queued successfully');
      await fetchActions();
      return data;
    } catch (err) {
      console.error('Error inserting action:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to queue action');
      throw err;
    }
  }, [user, fetchActions]);

  const triggerWorker = useCallback(async () => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('actions-worker');
      
      if (invokeError) throw invokeError;
      
      toast.success(`Worker completed: ${data?.processed || 0} actions processed`);
      await fetchActions();
      return data;
    } catch (err) {
      console.error('Error triggering worker:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to trigger worker');
      throw err;
    }
  }, [fetchActions]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions,
    loading,
    error,
    refetch: fetchActions,
    insertAction,
    triggerWorker
  };
}
