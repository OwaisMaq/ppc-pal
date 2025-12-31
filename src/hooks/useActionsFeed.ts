import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ActionItem {
  id: string;
  action_type: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'applied' | 'failed' | 'skipped' | 'prevented' | 'rejected';
  created_at: string;
  applied_at?: string;
  error?: string;
  rule_id: string | null;
  profile_id: string;
  amazon_api_response?: Record<string, unknown>;
  user_id?: string;
  // Enriched fields (joined or from payload)
  entity_name?: string;
  trigger_reason?: string;
  estimated_impact?: string;
  trigger_metrics?: Record<string, number>;
}

export interface ActionStats {
  total: number;
  applied: number;
  queued: number;
  failed: number;
  skipped: number;
  prevented: number;
}

export const useActionsFeed = (limit: number = 20, statusFilter?: string) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState<ActionStats>({ total: 0, applied: 0, queued: 0, failed: 0, skipped: 0, prevented: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch counts for each status
      const statuses = ['applied', 'queued', 'failed', 'skipped', 'prevented'];
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
        prevented: counts.find(c => c.status === 'prevented')?.count || 0,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching action stats:', error);
    }
  }, [user]);

  // Enrich actions with entity names from campaigns/targets tables
  const enrichActions = useCallback(async (rawActions: ActionItem[]): Promise<ActionItem[]> => {
    if (!rawActions.length) return rawActions;

    // Extract campaign IDs that need lookup
    const campaignIdsToLookup = new Set<string>();
    
    rawActions.forEach(action => {
      const payload = action.payload as Record<string, any>;
      // Only lookup if entity_name is missing
      if (!payload.entity_name) {
        if (payload.campaign_id) campaignIdsToLookup.add(payload.campaign_id);
        if (payload.entityId && payload.entityType === 'campaign') {
          campaignIdsToLookup.add(payload.entityId);
        }
      }
    });

    // Fetch campaign names if needed
    let campaignMap = new Map<string, string>();
    if (campaignIdsToLookup.size > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('amazon_campaign_id, name')
        .in('amazon_campaign_id', Array.from(campaignIdsToLookup));
      
      if (campaigns) {
        campaigns.forEach(c => campaignMap.set(c.amazon_campaign_id, c.name));
      }
    }

    // Enrich each action
    return rawActions.map(action => {
      const payload = action.payload as Record<string, any>;
      
      // If payload already has rich data, use it
      if (payload.entity_name) {
        return {
          ...action,
          entity_name: payload.entity_name,
          trigger_reason: payload.reason,
          estimated_impact: payload.estimated_impact,
          trigger_metrics: payload.trigger_metrics
        };
      }

      // Fallback: look up entity name
      let entityName = payload.entity_name;
      if (!entityName) {
        if (payload.keyword_text) {
          entityName = `"${payload.keyword_text}"`;
        } else if (payload.campaign_id && campaignMap.has(payload.campaign_id)) {
          entityName = campaignMap.get(payload.campaign_id);
        } else if (payload.entityId) {
          if (payload.entityType === 'campaign' && campaignMap.has(payload.entityId)) {
            entityName = campaignMap.get(payload.entityId);
          } else {
            // Last resort: show truncated ID
            entityName = `${payload.entityType || 'Target'} ...${payload.entityId.slice(-6)}`;
          }
        } else if (payload.target_id) {
          entityName = `Target ...${payload.target_id.slice(-6)}`;
        }
      }

      // Build trigger reason from available data
      let triggerReason = payload.reason;
      if (!triggerReason) {
        const metrics = payload.trigger_metrics;
        if (metrics) {
          if (metrics.acos !== undefined) {
            triggerReason = `ACOS ${metrics.acos.toFixed(0)}%`;
          } else if (metrics.usage_percent !== undefined) {
            triggerReason = `Budget ${metrics.usage_percent.toFixed(0)}% used`;
          } else if (metrics.clicks !== undefined && metrics.conversions !== undefined) {
            triggerReason = `${metrics.clicks} clicks, ${metrics.conversions} conversions`;
          }
        }
      }

      return {
        ...action,
        entity_name: entityName,
        trigger_reason: triggerReason,
        estimated_impact: payload.estimated_impact,
        trigger_metrics: payload.trigger_metrics
      };
    });
  }, []);

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
      
      // Enrich actions with entity names
      const enrichedActions = await enrichActions((data || []) as ActionItem[]);
      setActions(enrichedActions);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, limit, statusFilter, enrichActions]);

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
