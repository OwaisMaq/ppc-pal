import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizationState {
  entityId: string;
  entityType: string;
  enabled: boolean;
}

export function useEntityOptimization(profileId?: string) {
  const [optimizationMap, setOptimizationMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  // Fetch optimization states for all entities in profile
  useEffect(() => {
    if (!profileId) return;

    const fetchOptimizationStates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bid_states')
          .select('entity_id, optimization_enabled')
          .eq('profile_id', profileId);

        if (error) throw error;

        const map = new Map<string, boolean>();
        data?.forEach((row) => {
          map.set(row.entity_id, row.optimization_enabled ?? true);
        });
        setOptimizationMap(map);
      } catch (err) {
        console.error('Failed to fetch optimization states:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptimizationStates();
  }, [profileId]);

  const toggleOptimization = useCallback(async (
    entityId: string,
    entityType: 'campaign' | 'adgroup' | 'keyword' | 'target',
    enabled: boolean
  ) => {
    if (!profileId) return;

    // Optimistic update
    setOptimizationMap(prev => {
      const next = new Map(prev);
      next.set(entityId, enabled);
      return next;
    });

    try {
      // Try to update existing record first
      const { data: existing, error: selectError } = await supabase
        .from('bid_states')
        .select('id')
        .eq('profile_id', profileId)
        .eq('entity_id', entityId)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('bid_states')
          .update({ optimization_enabled: enabled })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record with minimal required fields
        const { error: insertError } = await supabase
          .from('bid_states')
          .insert({
            profile_id: profileId,
            entity_id: entityId,
            entity_type: entityType,
            optimization_enabled: enabled,
            alpha: 1,
            beta: 1,
            prior_alpha: 1,
            prior_beta: 1,
            observations_count: 0,
            total_clicks: 0,
            total_conversions: 0,
            total_impressions: 0,
            total_sales_micros: 0,
            total_spend_micros: 0,
          });

        if (insertError) throw insertError;
      }

      toast.success(`Auto-optimization ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Failed to toggle optimization:', err);
      toast.error('Failed to update optimization setting');
      
      // Revert optimistic update
      setOptimizationMap(prev => {
        const next = new Map(prev);
        next.set(entityId, !enabled);
        return next;
      });
    }
  }, [profileId]);

  return {
    optimizationMap,
    toggleOptimization,
    loading,
  };
}
