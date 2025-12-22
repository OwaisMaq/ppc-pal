import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  SkipForward,
  TrendingDown,
  DollarSign,
  Target,
  Pause,
  Play,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  History
} from "lucide-react";
import { format } from "date-fns";

type StatusFilter = 'all' | 'applied' | 'queued' | 'failed' | 'skipped';

const ActionsHistory = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { actions, stats, loading, refetch } = useActionsFeed(50, statusFilter === 'all' ? undefined : statusFilter);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

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

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'update_bid':
      case 'bid_adjustment':
        return <TrendingDown className="h-4 w-4" />;
      case 'update_budget':
      case 'budget_change':
        return <DollarSign className="h-4 w-4" />;
      case 'pause_target':
      case 'pause_keyword':
        return <Pause className="h-4 w-4" />;
      case 'enable_target':
      case 'enable_keyword':
        return <Play className="h-4 w-4" />;
      case 'add_negative':
      case 'negative_keyword':
        return <MinusCircle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      update_bid: 'Bid Update',
      bid_adjustment: 'Bid Adjustment',
      update_budget: 'Budget Update',
      budget_change: 'Budget Change',
      pause_target: 'Pause Target',
      pause_keyword: 'Pause Keyword',
      enable_target: 'Enable Target',
      enable_keyword: 'Enable Keyword',
      add_negative: 'Add Negative',
      negative_keyword: 'Negative Keyword',
    };
    return labels[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
          <Badge className="bg-muted text-muted-foreground border-border gap-1">
            <SkipForward className="h-3 w-3" />
            Skipped
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatActionDetails = (action: typeof actions[0]) => {
    const payload = action.payload;
    if (!payload) return null;

    const details: string[] = [];
    
    if (payload.entity_name) {
      details.push(payload.entity_name as string);
    }
    if (payload.campaign_name) {
      details.push(`Campaign: ${payload.campaign_name}`);
    }
    if (payload.keyword) {
      details.push(`Keyword: "${payload.keyword}"`);
    }
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

    return details.length > 0 ? details.join(' • ') : null;
  };

  const filterButtons: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'applied', label: 'Applied', count: stats.applied },
    { value: 'queued', label: 'Queued', count: stats.queued },
    { value: 'failed', label: 'Failed', count: stats.failed },
    { value: 'skipped', label: 'Skipped', count: stats.skipped },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        {/* Filter skeleton */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        {/* Cards skeleton */}
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
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <SkipForward className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{stats.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
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
                      {getStatusBadge(action.status)}
                    </div>
                    
                    {/* Action details */}
                    {formatActionDetails(action) && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        {formatActionDetails(action)}
                      </p>
                    )}
                    
                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(action.created_at), 'MMM dd, h:mm a')}</span>
                      {action.applied_at && (
                        <span>Applied: {format(new Date(action.applied_at), 'MMM dd, h:mm a')}</span>
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
                                Hide API Response
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                View API Response
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

                  {/* Retry button for failed actions */}
                  {action.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsHistory;
