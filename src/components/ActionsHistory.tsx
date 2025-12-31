import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useActionsFeed, ActionItem } from "@/hooks/useActionsFeed";
import { useRevertAction } from "@/hooks/useRevertAction";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Lightbulb,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  Pause,
  Play,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  History,
  Undo2,
  ArrowRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

type StatusFilter = 'all' | 'applied' | 'queued' | 'failed' | 'skipped' | 'suggested';

const ActionsHistory = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { actions, stats, loading, refetch } = useActionsFeed(50, statusFilter === 'all' ? undefined : statusFilter);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [revertingAction, setRevertingAction] = useState<string | null>(null);
  const { revertAction, loading: revertLoading } = useRevertAction();

  const toggleExpanded = (id: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRevert = async (actionId: string) => {
    setRevertingAction(actionId);
    const success = await revertAction(actionId);
    if (success) {
      refetch();
    }
    setRevertingAction(null);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'update_bid':
      case 'bid_adjustment':
      case 'set_bid':
      case 'set_keyword_bid':
        return <TrendingDown className="h-4 w-4" />;
      case 'update_budget':
      case 'budget_change':
      case 'update_campaign_budget':
        return <DollarSign className="h-4 w-4" />;
      case 'pause_target':
      case 'pause_keyword':
      case 'pause_campaign':
      case 'pause_ad_group':
        return <Pause className="h-4 w-4" />;
      case 'enable_target':
      case 'enable_keyword':
      case 'enable_campaign':
      case 'enable_ad_group':
        return <Play className="h-4 w-4" />;
      case 'add_negative':
      case 'negative_keyword':
        return <MinusCircle className="h-4 w-4" />;
      case 'create_keyword':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      update_bid: 'Bid Update',
      bid_adjustment: 'Bid Adjustment',
      set_bid: 'Set Bid',
      set_keyword_bid: 'Set Keyword Bid',
      update_budget: 'Budget Update',
      budget_change: 'Budget Change',
      update_campaign_budget: 'Campaign Budget',
      pause_target: 'Pause Target',
      pause_keyword: 'Pause Keyword',
      pause_campaign: 'Pause Campaign',
      pause_ad_group: 'Pause Ad Group',
      enable_target: 'Enable Target',
      enable_keyword: 'Enable Keyword',
      enable_campaign: 'Enable Campaign',
      enable_ad_group: 'Enable Ad Group',
      add_negative: 'Add Negative',
      negative_keyword: 'Negative Keyword',
      create_keyword: 'Create Keyword',
    };
    return labels[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (action: ActionItem) => {
    // Check if reverted
    if ((action as any).reverted_at) {
      return (
        <Badge className="bg-muted text-muted-foreground border-border gap-1">
          <Undo2 className="h-3 w-3" />
          Reverted
        </Badge>
      );
    }

    switch (action.status) {
      case 'applied':
        return (
          <Badge className="bg-success/20 text-success border-success/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Applied
          </Badge>
        );
      case 'queued':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'skipped':
        return (
          <Badge className="bg-info/20 text-info border-info/30 gap-1">
            <Lightbulb className="h-3 w-3" />
            Suggested
          </Badge>
        );
      case 'prevented':
      case 'rejected':
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <XCircle className="h-3 w-3" />
            Not Applied
          </Badge>
        );
      default:
        return <Badge variant="outline">{action.status}</Badge>;
    }
  };

  const formatMetricChange = (payload: Record<string, unknown>, beforeState?: Record<string, unknown>) => {
    const changes: JSX.Element[] = [];
    
    // Format bid changes
    if (payload.bid_micros !== undefined) {
      const newBid = (payload.bid_micros as number) / 1000000;
      const oldBid = beforeState?.bid_micros 
        ? (beforeState.bid_micros as number) / 1000000 
        : payload.old_bid 
          ? (payload.old_bid as number) / 1000000 
          : null;
      
      if (oldBid !== null) {
        changes.push(
          <span key="bid" className="inline-flex items-center gap-1">
            Bid: ${oldBid.toFixed(2)} <ArrowRight className="h-3 w-3" /> ${newBid.toFixed(2)}
          </span>
        );
      } else {
        changes.push(<span key="bid">Bid: ${newBid.toFixed(2)}</span>);
      }
    }

    // Format budget changes
    if (payload.daily_budget_micros !== undefined) {
      const newBudget = (payload.daily_budget_micros as number) / 1000000;
      const oldBudget = beforeState?.daily_budget_micros 
        ? (beforeState.daily_budget_micros as number) / 1000000 
        : payload.old_budget 
          ? (payload.old_budget as number) / 1000000 
          : null;
      
      if (oldBudget !== null) {
        changes.push(
          <span key="budget" className="inline-flex items-center gap-1">
            Budget: ${oldBudget.toFixed(2)} <ArrowRight className="h-3 w-3" /> ${newBudget.toFixed(2)}
          </span>
        );
      } else {
        changes.push(<span key="budget">Budget: ${newBudget.toFixed(2)}</span>);
      }
    }

    return changes.length > 0 ? changes : null;
  };

  const formatActionDetails = (action: ActionItem) => {
    const payload = action.payload;
    const beforeState = (action as any).before_state as Record<string, unknown> | undefined;
    if (!payload) return null;

    const details: (string | JSX.Element)[] = [];
    
    if (payload.entity_name) {
      details.push(payload.entity_name as string);
    }
    if (payload.campaign_name) {
      details.push(`Campaign: ${payload.campaign_name}`);
    }
    if (payload.keyword_text || payload.keyword) {
      details.push(`Keyword: "${payload.keyword_text || payload.keyword}"`);
    }

    // Add metric changes
    const metricChanges = formatMetricChange(payload, beforeState);
    if (metricChanges) {
      details.push(...metricChanges);
    }

    // Legacy format support
    if (!metricChanges) {
      if (payload.new_bid !== undefined) {
        const oldBid = payload.old_bid ? `$${(payload.old_bid as number / 1000000).toFixed(2)}` : '';
        const newBid = `$${(payload.new_bid as number / 1000000).toFixed(2)}`;
        details.push(oldBid ? `Bid: ${oldBid} → ${newBid}` : `Bid: ${newBid}`);
      }
      if (payload.new_budget !== undefined) {
        const oldBudget = payload.old_budget ? `$${(payload.old_budget as number / 1000000).toFixed(2)}` : '';
        const newBudget = `$${(payload.new_budget as number / 1000000).toFixed(2)}`;
        details.push(oldBudget ? `Budget: ${oldBudget} → ${newBudget}` : `Budget: ${newBudget}`);
      }
    }

    return details.length > 0 ? details : null;
  };

  const canRevert = (action: ActionItem) => {
    // Can only revert applied actions that haven't been reverted
    if (action.status !== 'applied') return false;
    if ((action as any).reverted_at) return false;
    
    // Cannot revert keyword creation (would require deletion)
    if (['create_keyword', 'negative_keyword'].includes(action.action_type)) return false;
    
    return true;
  };

  const filterButtons: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'applied', label: 'Applied', count: stats.applied },
    { value: 'queued', label: 'Queued', count: stats.queued },
    { value: 'failed', label: 'Failed', count: stats.failed },
    { value: 'skipped', label: 'Suggested', count: stats.skipped },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{stats.applied}</p>
                <p className="text-xs text-muted-foreground">Applied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{stats.queued}</p>
                <p className="text-xs text-muted-foreground">Queued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-info" />
              <div>
                <p className="text-2xl font-bold text-info">{stats.skipped}</p>
                <p className="text-xs text-muted-foreground">Suggested</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map(btn => (
          <Button
            key={btn.value}
            variant={statusFilter === btn.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(btn.value)}
            className="gap-1"
          >
            {btn.label}
            {btn.count !== undefined && btn.count > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {btn.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {statusFilter === 'all' 
              ? 'No actions recorded yet. Actions will appear here when AI recommendations are applied.'
              : `No ${statusFilter} actions found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <Card 
              key={action.id} 
              className={`border-l-4 ${
                (action as any).reverted_at ? 'border-l-muted opacity-75' :
                action.status === 'applied' ? 'border-l-success' :
                action.status === 'failed' ? 'border-l-destructive' :
                action.status === 'queued' ? 'border-l-warning' :
                'border-l-muted'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Action header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getActionIcon(action.action_type)}
                      <span className="font-medium">{getActionLabel(action.action_type)}</span>
                      {getStatusBadge(action)}
                    </div>
                    
                    {/* Action details with before/after */}
                    {formatActionDetails(action) && (
                      <div className="text-sm text-muted-foreground mb-2 flex flex-wrap gap-2">
                        {(formatActionDetails(action) || []).map((detail, i) => (
                          <span key={i}>{detail}</span>
                        ))}
                      </div>
                    )}
                    
                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(action.created_at), 'MMM dd, h:mm a')}</span>
                      {action.applied_at && (
                        <span>Applied: {format(new Date(action.applied_at), 'MMM dd, h:mm a')}</span>
                      )}
                      {(action as any).reverted_at && (
                        <span className="text-warning">
                          Reverted: {format(new Date((action as any).reverted_at), 'MMM dd, h:mm a')}
                        </span>
                      )}
                    </div>

                    {/* Error message for failed actions */}
                    {action.status === 'failed' && action.error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded-md border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">Error:</p>
                        <p className="text-sm text-destructive/80">{action.error}</p>
                      </div>
                    )}

                    {/* Expandable API response */}
                    {action.amazon_api_response && (
                      <Collapsible 
                        open={expandedActions.has(action.id)}
                        onOpenChange={() => toggleExpanded(action.id)}
                        className="mt-3"
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                            {expandedActions.has(action.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                View Details
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-48">
                            {JSON.stringify(action.amazon_api_response, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {/* Undo button for applied actions */}
                    {canRevert(action) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={revertLoading && revertingAction === action.id}
                        onClick={() => handleRevert(action.id)}
                      >
                        {revertLoading && revertingAction === action.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Undo2 className="h-3 w-3" />
                        )}
                        Undo
                      </Button>
                    )}

                    {/* Retry button for failed actions */}
                    {action.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          // TODO: Implement retry functionality
                          refetch();
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsHistory;
