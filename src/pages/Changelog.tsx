import { useState, useMemo } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useActionsFeed, ActionItem } from '@/hooks/useActionsFeed';
import { useRevertAction } from '@/hooks/useRevertAction';
import { 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Undo2,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Target,
  DollarSign,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type EntityType = 'all' | 'campaign' | 'ad_group' | 'keyword' | 'target';
type StatusFilter = 'all' | 'applied' | 'queued' | 'failed' | 'reverted';

// Map action_type to entity category
const getEntityType = (actionType: string): EntityType => {
  if (actionType.includes('campaign') || actionType === 'update_budget') return 'campaign';
  if (actionType.includes('ad_group') || actionType.includes('adgroup')) return 'ad_group';
  if (actionType.includes('keyword') || actionType === 'create_negative') return 'keyword';
  if (actionType.includes('target') || actionType === 'set_bid') return 'target';
  return 'campaign'; // Default
};

// Check if action is reverted
const isReverted = (action: ActionItem): boolean => {
  const payload = action.payload as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(payload?.reverted_at || (action as any).reverted_at);
};

// Get effective status including reverted
const getEffectiveStatus = (action: ActionItem): string => {
  if (isReverted(action)) return 'reverted';
  return action.status;
};

// Get action icon
const getActionIcon = (actionType: string) => {
  if (actionType.includes('pause')) return Pause;
  if (actionType.includes('enable') || actionType.includes('resume')) return Play;
  if (actionType.includes('bid') || actionType === 'set_bid') return TrendingUp;
  if (actionType.includes('budget')) return DollarSign;
  if (actionType.includes('negative')) return MinusCircle;
  return Target;
};

// Get action label
const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'pause_campaign': 'Pause Campaign',
    'enable_campaign': 'Enable Campaign',
    'update_campaign_budget': 'Update Budget',
    'update_budget': 'Update Budget',
    'pause_ad_group': 'Pause Ad Group',
    'enable_ad_group': 'Enable Ad Group',
    'pause_keyword': 'Pause Keyword',
    'enable_keyword': 'Enable Keyword',
    'set_keyword_bid': 'Update Keyword Bid',
    'create_negative': 'Create Negative',
    'negative_keyword': 'Negative Keyword',
    'pause_target': 'Pause Target',
    'enable_target': 'Enable Target',
    'set_bid': 'Update Bid',
    'set_target_bid': 'Update Target Bid',
  };
  return labels[actionType] || actionType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Get status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'applied':
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Applied</Badge>;
    case 'queued':
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case 'reverted':
      return <Badge variant="outline" className="bg-muted text-muted-foreground"><Undo2 className="h-3 w-3 mr-1" />Reverted</Badge>;
    case 'skipped':
      return <Badge variant="outline" className="text-muted-foreground">Skipped</Badge>;
    case 'prevented':
      return <Badge variant="outline" className="text-muted-foreground">Prevented</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Format metric change
const formatMetricChange = (action: ActionItem): string | null => {
  const payload = action.payload as Record<string, unknown>;
  const metrics = payload.trigger_metrics as Record<string, number> | undefined;
  
  if (metrics) {
    if (metrics.current_bid !== undefined && metrics.new_bid !== undefined) {
      const change = ((metrics.new_bid - metrics.current_bid) / metrics.current_bid * 100);
      const sign = change > 0 ? '+' : '';
      return `$${metrics.current_bid.toFixed(2)} → $${metrics.new_bid.toFixed(2)} (${sign}${change.toFixed(0)}%)`;
    }
    if (metrics.current_budget !== undefined && metrics.new_budget !== undefined) {
      const change = ((metrics.new_budget - metrics.current_budget) / metrics.current_budget * 100);
      const sign = change > 0 ? '+' : '';
      return `$${metrics.current_budget.toFixed(2)} → $${metrics.new_budget.toFixed(2)} (${sign}${change.toFixed(0)}%)`;
    }
  }
  
  // Fallback to payload values
  if (payload.old_bid !== undefined && payload.new_bid !== undefined) {
    const oldBid = Number(payload.old_bid);
    const newBid = Number(payload.new_bid);
    const change = ((newBid - oldBid) / oldBid * 100);
    const sign = change > 0 ? '+' : '';
    return `$${oldBid.toFixed(2)} → $${newBid.toFixed(2)} (${sign}${change.toFixed(0)}%)`;
  }
  
  if (payload.old_budget !== undefined && payload.new_budget !== undefined) {
    const oldBudget = Number(payload.old_budget);
    const newBudget = Number(payload.new_budget);
    const change = ((newBudget - oldBudget) / oldBudget * 100);
    const sign = change > 0 ? '+' : '';
    return `$${oldBudget.toFixed(2)} → $${newBudget.toFixed(2)} (${sign}${change.toFixed(0)}%)`;
  }
  
  return null;
};

const Changelog = () => {
  const [entityFilter, setEntityFilter] = useState<EntityType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [revertingAction, setRevertingAction] = useState<string | null>(null);
  
  const { actions, stats, loading, refetch } = useActionsFeed(100);
  const { revertAction, loading: reverting } = useRevertAction();

  // Filter actions
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      // Entity type filter
      if (entityFilter !== 'all') {
        const actionEntityType = getEntityType(action.action_type);
        if (actionEntityType !== entityFilter) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        const effectiveStatus = getEffectiveStatus(action);
        if (effectiveStatus !== statusFilter) return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const entityName = action.entity_name?.toLowerCase() || '';
        const actionType = action.action_type.toLowerCase();
        if (!entityName.includes(query) && !actionType.includes(query)) return false;
      }
      
      return true;
    });
  }, [actions, entityFilter, statusFilter, searchQuery]);

  // Calculate stats including reverted
  const enhancedStats = useMemo(() => {
    const reverted = actions.filter(a => isReverted(a)).length;
    return { ...stats, reverted };
  }, [actions, stats]);

  // Toggle expanded state
  const toggleExpanded = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  // Handle revert
  const handleRevert = async (actionId: string) => {
    setRevertingAction(actionId);
    await revertAction(actionId, 'User reverted from changelog');
    refetch();
    setRevertingAction(null);
  };

  // Can revert check
  const canRevert = (action: ActionItem): boolean => {
    return action.status === 'applied' && !isReverted(action);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Change Log</h1>
            <p className="text-sm text-muted-foreground">
              Track all automated and manual changes to your campaigns
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-12" /> : enhancedStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('applied')}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-emerald-600">{loading ? <Skeleton className="h-8 w-12" /> : enhancedStats.applied}</div>
              <div className="text-xs text-muted-foreground">Applied</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('queued')}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-amber-600">{loading ? <Skeleton className="h-8 w-12" /> : enhancedStats.queued}</div>
              <div className="text-xs text-muted-foreground">Queued</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('failed')}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-destructive">{loading ? <Skeleton className="h-8 w-12" /> : enhancedStats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('reverted')}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-muted-foreground">{loading ? <Skeleton className="h-8 w-12" /> : enhancedStats.reverted}</div>
              <div className="text-xs text-muted-foreground">Reverted</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Entity Type Tabs */}
          <Tabs value={entityFilter} onValueChange={(v) => setEntityFilter(v as EntityType)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="campaign">Campaigns</TabsTrigger>
              <TabsTrigger value="ad_group">Ad Groups</TabsTrigger>
              <TabsTrigger value="keyword">Keywords</TabsTrigger>
              <TabsTrigger value="target">Targets</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search changes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'applied', 'queued', 'failed', 'reverted'] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All Statuses' : status}
            </Button>
          ))}
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredActions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">No changes found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || entityFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Actions will appear here as they are processed'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredActions.map((action) => {
              const ActionIcon = getActionIcon(action.action_type);
              const effectiveStatus = getEffectiveStatus(action);
              const metricChange = formatMetricChange(action);
              const isExpanded = expandedActions.has(action.id);
              
              return (
                <Card key={action.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ActionIcon className="h-5 w-5 text-foreground" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{getActionLabel(action.action_type)}</span>
                            {getStatusBadge(effectiveStatus)}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {canRevert(action) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevert(action.id)}
                                disabled={reverting || revertingAction === action.id}
                              >
                                <Undo2 className="h-4 w-4 mr-1" />
                                {revertingAction === action.id ? 'Reverting...' : 'Undo'}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Entity Name */}
                        {action.entity_name && (
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {action.entity_name}
                          </p>
                        )}
                        
                        {/* Metric Change */}
                        {metricChange && (
                          <div className="flex items-center gap-1 text-sm mb-2">
                            {metricChange.includes('+') ? (
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <span className="font-mono">{metricChange}</span>
                          </div>
                        )}
                        
                        {/* Error Message */}
                        {action.error && (
                          <p className="text-sm text-destructive mb-2">{action.error}</p>
                        )}
                        
                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</span>
                          {action.applied_at && (
                            <span>Applied {format(new Date(action.applied_at), 'MMM d, h:mm a')}</span>
                          )}
                        </div>
                        
                        {/* Expandable Details */}
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(action.id)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Show Details
                                </>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs font-mono overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(action.payload, null, 2)}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Changelog;
