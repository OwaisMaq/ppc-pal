import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { useBudgetCopilot } from "@/hooks/useBudgetCopilot";
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/automation";
import { 
  ClipboardCheck,
  TrendingUp, 
  TrendingDown,
  Ban, 
  Activity,
  DollarSign,
  Check,
  X,
  Loader2,
  Pause,
  Play,
  Wallet,
  Minus
} from "lucide-react";

interface UnifiedPendingItem {
  id: string;
  source: 'action_queue' | 'budget_recommendation';
  type: string;
  label: string;
  details: string;
  status: string;
  createdAt: string;
  confidence?: number;
  originalData: any;
  // For budget recommendations
  currentBudget?: number;
  suggestedBudget?: number;
  paceRatio?: number;
  budgetAction?: 'increase' | 'decrease' | 'hold';
}

const PendingApprovals = () => {
  const { actions, loading: actionsLoading, refetch: refetchActions } = useActionsFeed(50);
  const { selectedProfileId } = useGlobalFilters();
  const { 
    recommendations, 
    loading: budgetLoading, 
    fetchRecommendations,
    applyRecommendation,
    dismissRecommendation 
  } = useBudgetCopilot();
  
  const [processing, setProcessing] = useState<string[]>([]);

  // Fetch budget recommendations on mount and when profile changes
  useEffect(() => {
    fetchRecommendations(selectedProfileId || undefined);
  }, [selectedProfileId]);

  // Combine and normalize pending items
  const pendingItems = useMemo(() => {
    const items: UnifiedPendingItem[] = [];

    // Add action queue items
    const pendingActions = actions.filter(action => 
      action.status === 'queued' || 
      (action.status === 'skipped' && action.error !== 'User rejected')
    );

    pendingActions.forEach(action => {
      const payload = action.payload as Record<string, unknown>;
      const confidence = typeof payload?.confidence === 'number' 
        ? Math.round(payload.confidence * 100) 
        : undefined;
      
      items.push({
        id: action.id,
        source: 'action_queue',
        type: action.action_type,
        label: getActionLabel(action.action_type),
        details: formatActionDetails(action),
        status: action.status,
        createdAt: action.created_at,
        confidence,
        originalData: action,
      });
    });

    // Add budget recommendations
    const openRecommendations = recommendations.filter(rec => rec.state === 'open');
    openRecommendations.forEach(rec => {
      const budgetAction = rec.action as 'increase' | 'decrease' | 'hold';
      const currentBudgetMicros = rec.current_budget_micros ?? 0;
      const suggestedBudgetMicros = rec.suggested_budget_micros ?? 0;
      
      items.push({
        id: rec.id,
        source: 'budget_recommendation',
        type: `budget_${budgetAction}`,
        label: getBudgetActionLabel(budgetAction),
        details: rec.campaign_id ? `Campaign ${rec.campaign_id.slice(-8)}` : 'Campaign',
        status: 'pending',
        createdAt: rec.created_at,
        originalData: rec,
        currentBudget: currentBudgetMicros / 1_000_000,
        suggestedBudget: suggestedBudgetMicros > 0 ? suggestedBudgetMicros / 1_000_000 : undefined,
        paceRatio: rec.pace_ratio,
        budgetAction,
      });
    });

    // Sort by created date (most recent first)
    return items.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [actions, recommendations]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'set_bid':
        return TrendingUp;
      case 'negative_keyword':
      case 'negative_product':
        return Ban;
      case 'pause_target':
      case 'disable_entity':
        return Pause;
      case 'enable_entity':
        return Play;
      case 'set_placement_adjust':
        return Activity;
      case 'budget_increase':
        return TrendingUp;
      case 'budget_decrease':
        return TrendingDown;
      case 'budget_hold':
        return Minus;
      default:
        return DollarSign;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return 'Adjust Bid';
      case 'negative_keyword':
        return 'Add Negative Keyword';
      case 'negative_product':
        return 'Add Negative Product';
      case 'pause_target':
        return 'Pause Target';
      case 'set_placement_adjust':
        return 'Adjust Placement';
      case 'create_keyword':
        return 'Add Keyword';
      case 'enable_entity':
        return 'Re-enable Entity';
      case 'disable_entity':
        return 'Disable Entity';
      default:
        return actionType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  const getBudgetActionLabel = (action: 'increase' | 'decrease' | 'hold') => {
    switch (action) {
      case 'increase':
        return 'Increase Budget';
      case 'decrease':
        return 'Decrease Budget';
      case 'hold':
        return 'Hold Budget';
    }
  };

  const formatActionDetails = (action: any) => {
    const { action_type, payload } = action;
    const entityName = payload.entity_name || payload.keyword_text || payload.target_name;
    
    switch (action_type) {
      case 'set_bid':
        const bidInfo = payload.new_bid ? `$${payload.new_bid}` : '';
        return entityName ? `${entityName}${bidInfo ? ` → ${bidInfo}` : ''}` : bidInfo || 'Bid change';
      case 'negative_keyword':
        return payload.keyword_text ? `"${payload.keyword_text}"` : 'Keyword';
      case 'negative_product':
        return payload.asin ? `ASIN: ${payload.asin}` : 'Product';
      case 'pause_target':
      case 'enable_entity':
      case 'disable_entity':
        return entityName || 'Target';
      case 'set_placement_adjust':
        return payload.placement ? `${payload.placement} placement` : 'Placement';
      default:
        return entityName || 'Action pending';
    }
  };

  const formatBudget = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleApprove = async (item: UnifiedPendingItem) => {
    setProcessing(prev => [...prev, item.id]);
    
    try {
      if (item.source === 'action_queue') {
        // Handle action queue approval
        const action = item.originalData;
        if (action?.status === 'skipped') {
          const { error: updateError } = await supabase
            .from('action_queue')
            .update({ status: 'queued', error: null })
            .eq('id', item.id);
          
          if (updateError) throw updateError;
        }
        
        const { error } = await supabase.functions.invoke('actions-worker', {
          body: { action_id: item.id }
        });
        
        if (error) throw error;
        toast.success('Action approved and applied');
        refetchActions();
      } else {
        // Handle budget recommendation approval
        await applyRecommendation(item.id);
      }
    } catch (err) {
      console.error('Failed to approve:', err);
      toast.error('Failed to approve action');
    } finally {
      setProcessing(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleReject = async (item: UnifiedPendingItem) => {
    setProcessing(prev => [...prev, item.id]);
    
    try {
      if (item.source === 'action_queue') {
        const { error } = await supabase
          .from('action_queue')
          .update({ status: 'skipped', error: 'User rejected' })
          .eq('id', item.id);
        
        if (error) throw error;
        toast.success('Action rejected');
        refetchActions();
      } else {
        await dismissRecommendation(item.id);
      }
    } catch (err) {
      console.error('Failed to reject:', err);
      toast.error('Failed to reject action');
    } finally {
      setProcessing(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleApproveAll = async () => {
    const queuedActions = pendingItems.filter(
      item => item.source === 'action_queue' && item.status === 'queued'
    );
    if (queuedActions.length === 0) return;
    
    const actionIds = queuedActions.map(a => a.id);
    setProcessing(actionIds);
    
    try {
      const { error } = await supabase.functions.invoke('actions-worker', {
        body: { approve_all: true }
      });
      
      if (error) throw error;
      
      toast.success(`${queuedActions.length} actions approved`);
      refetchActions();
    } catch (err) {
      console.error('Failed to approve all actions:', err);
      toast.error('Failed to approve all actions');
    }
  };

  const loading = actionsLoading || budgetLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Review actions before they're applied</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No actions pending approval
          </p>
        </CardContent>
      </Card>
    );
  }

  const actionQueueItems = pendingItems.filter(i => i.source === 'action_queue');
  const budgetItems = pendingItems.filter(i => i.source === 'budget_recommendation');
  const queuedCount = actionQueueItems.filter(a => a.status === 'queued').length;
  const skippedCount = actionQueueItems.filter(a => a.status === 'skipped').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Pending Approvals
              <Badge variant="secondary" className="ml-2">
                {pendingItems.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {queuedCount > 0 && `${queuedCount} actions`}
              {queuedCount > 0 && skippedCount > 0 && ' · '}
              {skippedCount > 0 && `${skippedCount} blocked`}
              {(queuedCount > 0 || skippedCount > 0) && budgetItems.length > 0 && ' · '}
              {budgetItems.length > 0 && `${budgetItems.length} budget`}
            </CardDescription>
          </div>
          {queuedCount > 1 && (
            <Button size="sm" onClick={handleApproveAll}>
              Approve All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingItems.slice(0, 5).map((item) => {
          const Icon = item.source === 'budget_recommendation' 
            ? Wallet 
            : getActionIcon(item.type);
          const isProcessing = processing.includes(item.id);
          const isSkipped = item.status === 'skipped';
          const isBudget = item.source === 'budget_recommendation';
          
          // Get icon color based on budget action type
          const getIconStyles = () => {
            if (isBudget) {
              switch (item.budgetAction) {
                case 'increase':
                  return { bg: 'bg-emerald-500/10', text: 'text-emerald-600' };
                case 'decrease':
                  return { bg: 'bg-amber-500/10', text: 'text-amber-600' };
                default:
                  return { bg: 'bg-muted', text: 'text-muted-foreground' };
              }
            }
            if (isSkipped) {
              return { bg: 'bg-muted', text: 'text-muted-foreground' };
            }
            return { bg: 'bg-primary/10', text: 'text-primary' };
          };
          
          const iconStyles = getIconStyles();
          
          return (
            <div 
              key={item.id} 
              className={`flex items-start justify-between p-3 rounded-lg border ${
                isSkipped ? 'bg-muted/50 border-muted' : 'bg-background'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${iconStyles.bg}`}>
                  <Icon className={`h-4 w-4 ${iconStyles.text}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {item.label}
                    </p>
                    {isSkipped && (
                      <Badge variant="outline" className="text-xs">
                        Blocked
                      </Badge>
                    )}
                    {isBudget && (
                      <Badge variant="outline" className="text-xs">
                        Budget
                      </Badge>
                    )}
                    {item.confidence && (
                      <ConfidenceBadge confidence={item.confidence} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.details}
                  </p>
                  {isBudget && item.currentBudget !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {formatBudget(item.currentBudget)}
                      {item.suggestedBudget && ` → ${formatBudget(item.suggestedBudget)}`}
                      {item.paceRatio && ` · Pace: ${item.paceRatio.toFixed(1)}x`}
                    </p>
                  )}
                  {isSkipped && item.originalData?.error && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {item.originalData.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(item)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-600/10"
                  onClick={() => handleApprove(item)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
        {pendingItems.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{pendingItems.length - 5} more pending
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovals;
