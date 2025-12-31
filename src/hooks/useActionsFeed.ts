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

  // Enrich actions with entity names from campaigns/keywords/targets tables
  const enrichActions = useCallback(async (rawActions: ActionItem[]): Promise<ActionItem[]> => {
    if (!rawActions.length) return rawActions;

    // Extract IDs that need lookup
    const campaignIdsToLookup = new Set<string>();
    const keywordIdsToLookup = new Set<string>();
    const targetIdsToLookup = new Set<string>();
    
    rawActions.forEach(action => {
      const payload = action.payload as Record<string, any>;
      // Only lookup if entity_name is missing
      if (!payload.entity_name) {
        if (payload.campaign_id) campaignIdsToLookup.add(payload.campaign_id);
        if (payload.entityId) {
          if (payload.entityType === 'campaign') campaignIdsToLookup.add(payload.entityId);
          else if (payload.entityType === 'keyword') keywordIdsToLookup.add(payload.entityId);
          else if (payload.entityType === 'target') targetIdsToLookup.add(payload.entityId);
        }
        if (payload.entity_id) {
          if (payload.entity_type === 'campaign') campaignIdsToLookup.add(payload.entity_id);
          else if (payload.entity_type === 'keyword') keywordIdsToLookup.add(payload.entity_id);
          else if (payload.entity_type === 'target') targetIdsToLookup.add(payload.entity_id);
        }
      }
    });

    // Fetch entity names in parallel
    const [campaignMap, keywordMap, targetMap] = await Promise.all([
      // Campaigns
      (async () => {
        const map = new Map<string, string>();
        if (campaignIdsToLookup.size > 0) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('amazon_campaign_id, name')
            .in('amazon_campaign_id', Array.from(campaignIdsToLookup));
          campaigns?.forEach(c => map.set(c.amazon_campaign_id, c.name));
        }
        return map;
      })(),
      // Keywords
      (async () => {
        const map = new Map<string, string>();
        if (keywordIdsToLookup.size > 0) {
          const { data: keywords } = await supabase
            .from('keywords')
            .select('amazon_keyword_id, keyword_text, match_type')
            .in('amazon_keyword_id', Array.from(keywordIdsToLookup));
          keywords?.forEach(k => map.set(k.amazon_keyword_id, `"${k.keyword_text}" (${k.match_type})`));
        }
        return map;
      })(),
      // Targets
      (async () => {
        const map = new Map<string, string>();
        if (targetIdsToLookup.size > 0) {
          const { data: targets } = await supabase
            .from('targets')
            .select('amazon_target_id, expression_type, expression')
            .in('amazon_target_id', Array.from(targetIdsToLookup));
          targets?.forEach(t => {
            const expr = String(t.expression || t.expression_type || 'Target');
            map.set(t.amazon_target_id, expr.length > 40 ? expr.substring(0, 37) + '...' : expr);
          });
        }
        return map;
      })()
    ]);

    // Enrich each action
    return rawActions.map(action => {
      const payload = action.payload as Record<string, any>;
      
      // If payload already has rich data, use it
      if (payload.entity_name) {
        return {
          ...action,
          entity_name: payload.entity_name,
          trigger_reason: payload.bid_display || payload.reason,
          estimated_impact: payload.estimated_impact,
          trigger_metrics: payload.trigger_metrics
        };
      }

      // Fallback: look up entity name
      let entityName: string | undefined;
      const entityId = payload.entityId || payload.entity_id;
      const entityType = payload.entityType || payload.entity_type;
      
      if (payload.keyword_text) {
        entityName = `"${payload.keyword_text}"`;
      } else if (entityId) {
        if (entityType === 'campaign' && campaignMap.has(entityId)) {
          entityName = campaignMap.get(entityId);
        } else if (entityType === 'keyword' && keywordMap.has(entityId)) {
          entityName = keywordMap.get(entityId);
        } else if (entityType === 'target' && targetMap.has(entityId)) {
          entityName = targetMap.get(entityId);
        } else if (payload.campaign_id && campaignMap.has(payload.campaign_id)) {
          entityName = campaignMap.get(payload.campaign_id);
        } else {
          // Last resort: show truncated ID with type
          entityName = `${entityType || 'Entity'} ...${entityId.slice(-6)}`;
        }
      } else if (payload.campaign_id && campaignMap.has(payload.campaign_id)) {
        entityName = campaignMap.get(payload.campaign_id);
      } else if (payload.target_id) {
        entityName = targetMap.get(payload.target_id) || `Target ...${payload.target_id.slice(-6)}`;
      }

      // Build trigger reason from available data
      let triggerReason = payload.bid_display || payload.reason;
      if (!triggerReason) {
        const metrics = payload.trigger_metrics;
        if (metrics) {
          if (metrics.sampled_cvr !== undefined && metrics.current_bid !== undefined && metrics.new_bid !== undefined) {
            // Bid optimizer action
            const changePercent = ((metrics.new_bid - metrics.current_bid) / metrics.current_bid * 100).toFixed(0);
            const sign = metrics.new_bid > metrics.current_bid ? '+' : '';
            triggerReason = `$${metrics.current_bid.toFixed(2)} → $${metrics.new_bid.toFixed(2)} (${sign}${changePercent}%)`;
          } else if (metrics.adjustment_percent !== undefined) {
            // Bulk bid adjustment
            const sign = metrics.adjustment_percent > 0 ? '+' : '';
            triggerReason = `Bid ${sign}${metrics.adjustment_percent.toFixed(0)}%`;
          } else if (metrics.acos !== undefined) {
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
