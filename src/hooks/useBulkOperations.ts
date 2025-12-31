import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type BulkOperationType = 
  | 'pause' 
  | 'enable' 
  | 'bid_increase' 
  | 'bid_decrease' 
  | 'set_bid' 
  | 'add_negative';

export interface BulkOperation {
  type: BulkOperationType;
  entityType: 'campaign' | 'ad_group' | 'keyword' | 'target';
  entityIds: string[];
  value?: number; // For bid operations: percentage or absolute value
  matchType?: 'exact' | 'phrase' | 'broad'; // For negative keywords
  negativeKeywords?: string[]; // For add_negative operation
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export const useBulkOperations = (profileId?: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const executeBulkOperation = useCallback(async (
    operation: BulkOperation
  ): Promise<BulkOperationResult> => {
    if (!profileId || !user) {
      return { success: false, processed: 0, failed: 0, errors: ['Not authenticated'] };
    }

    setLoading(true);
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    try {
      const { type, entityType, entityIds, value } = operation;

      // Handle different operation types
      switch (type) {
        case 'pause':
        case 'enable': {
          const newStatus = type === 'pause' ? 'paused' : 'enabled';
          const tableName = entityType === 'campaign' ? 'campaigns' :
                           entityType === 'ad_group' ? 'ad_groups' :
                           entityType === 'keyword' ? 'keywords' : 'targets';
          const idColumn = entityType === 'campaign' ? 'amazon_campaign_id' :
                          entityType === 'ad_group' ? 'amazon_adgroup_id' :
                          entityType === 'keyword' ? 'amazon_keyword_id' : 'amazon_target_id';

          // Queue actions for the action worker to apply via Amazon API
          for (const entityId of entityIds) {
            const idempotencyKey = `bulk_${type}_${entityId}_${Date.now()}`;
            
            const { error } = await supabase
              .from('action_queue')
              .insert({
                profile_id: profileId,
                user_id: user.id,
                action_type: type === 'pause' ? 'pause_entity' : 'enable_entity',
                payload: {
                  entityType,
                  entityId,
                  newStatus,
                },
                idempotency_key: idempotencyKey,
                status: 'queued',
              });

            if (error) {
              failed++;
              errors.push(`Failed to queue ${entityId}: ${error.message}`);
            } else {
              processed++;
            }
          }
          break;
        }

        case 'bid_increase':
        case 'bid_decrease': {
          const adjustPercent = value || 10;
          const multiplier = type === 'bid_increase' 
            ? 1 + adjustPercent / 100 
            : 1 - adjustPercent / 100;
          const changeSign = type === 'bid_increase' ? '+' : '-';

          for (const entityId of entityIds) {
            const idempotencyKey = `bulk_${type}_${entityId}_${Date.now()}`;
            
            const { error } = await supabase
              .from('action_queue')
              .insert({
                profile_id: profileId,
                user_id: user.id,
                action_type: 'adjust_bid',
                payload: {
                  entityType,
                  entityId,
                  adjustmentType: 'percentage',
                  multiplier,
                  originalValue: value,
                  // Enriched fields for display
                  reason: `Manual ${changeSign}${adjustPercent}% bid adjustment`,
                  bid_display: `Bid ${changeSign}${adjustPercent}%`,
                  trigger_metrics: {
                    adjustment_percent: type === 'bid_increase' ? adjustPercent : -adjustPercent,
                  },
                  estimated_impact: 'Manual bid adjustment'
                },
                idempotency_key: idempotencyKey,
                status: 'queued',
              });

            if (error) {
              failed++;
              errors.push(`Failed to queue bid change for ${entityId}`);
            } else {
              processed++;
            }
          }
          break;
        }

        case 'set_bid': {
          if (!value) {
            return { success: false, processed: 0, failed: 0, errors: ['Bid value required'] };
          }

          for (const entityId of entityIds) {
            const idempotencyKey = `bulk_set_bid_${entityId}_${Date.now()}`;
            
            const { error } = await supabase
              .from('action_queue')
              .insert({
                profile_id: profileId,
                user_id: user.id,
                action_type: 'set_bid',
                payload: {
                  entityType,
                  entityId,
                  newBid: value,
                  new_bid_micros: value * 1000000,
                  // Enriched fields for display
                  reason: 'Manual bid adjustment',
                  bid_display: `Set to $${value.toFixed(2)}`,
                  trigger_metrics: {
                    new_bid: value,
                  },
                  estimated_impact: 'Manual bid change'
                },
                idempotency_key: idempotencyKey,
                status: 'queued',
              });

            if (error) {
              failed++;
              errors.push(`Failed to queue bid set for ${entityId}`);
            } else {
              processed++;
            }
          }
          break;
        }

        case 'add_negative': {
          const keywords = operation.negativeKeywords || [];
          if (keywords.length === 0) {
            return { success: false, processed: 0, failed: 0, errors: ['No negative keywords provided'] };
          }

          for (const entityId of entityIds) {
            for (const keyword of keywords) {
              const idempotencyKey = `bulk_neg_${entityId}_${keyword}_${Date.now()}`;
              
              const { error } = await supabase
                .from('action_queue')
                .insert({
                  profile_id: profileId,
                  user_id: user.id,
                  action_type: 'add_negative',
                  payload: {
                    entityType,
                    entityId,
                    keyword,
                    matchType: operation.matchType || 'exact',
                  },
                  idempotency_key: idempotencyKey,
                  status: 'queued',
                });

              if (error) {
                failed++;
              } else {
                processed++;
              }
            }
          }
          break;
        }
      }

      const success = failed === 0;
      if (success) {
        toast.success(`${processed} actions queued successfully`);
      } else if (processed > 0) {
        toast.warning(`${processed} queued, ${failed} failed`);
      } else {
        toast.error('All operations failed');
      }

      return { success, processed, failed, errors };
    } catch (error) {
      console.error('Bulk operation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Bulk operation failed: ${message}`);
      return { success: false, processed, failed: operation.entityIds.length - processed, errors: [message] };
      return { success: false, processed, failed: operation.entityIds.length - processed, errors: [message] };
    } finally {
      setLoading(false);
    }
  }, [profileId, user]);

  return {
    executeBulkOperation,
    loading,
  };
};
