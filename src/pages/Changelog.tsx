import { useState, useMemo } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActionsFeed, ActionItem } from '@/hooks/useActionsFeed';
import { useRevertAction } from '@/hooks/useRevertAction';
import { 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Undo2,
  History,
  Plus,
  Minus,
  Bot,
  BookOpen,
  Zap,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type EntityType = 'all' | 'campaign' | 'ad_group' | 'keyword' | 'target';
type StatusFilter = 'all' | 'applied' | 'queued' | 'failed';

// Map action_type to entity category
const getEntityType = (actionType: string): EntityType => {
  if (actionType.includes('campaign') && !actionType.includes('negative')) return 'campaign';
  if (actionType.includes('ad_group') || actionType.includes('adgroup')) return 'ad_group';
  if (actionType.includes('keyword') || actionType.includes('negative') || actionType === 'create_keyword' || actionType === 'harvest_keyword' || actionType === 'st_harvest' || actionType === 'st_prune') return 'keyword';
  if (actionType.includes('target') || actionType === 'set_bid') return 'target';
  if (actionType === 'update_budget') return 'campaign';
  return 'campaign';
};

// Get action label
const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'pause_campaign': 'Paused',
    'enable_campaign': 'Enabled',
    'update_campaign_budget': 'Budget Changed',
    'update_budget': 'Budget Changed',
    'pause_ad_group': 'Paused',
    'enable_ad_group': 'Enabled',
    'pause_keyword': 'Paused',
    'enable_keyword': 'Enabled',
    'set_keyword_bid': 'Bid Changed',
    'create_negative': 'Added Negative',
    'negative_keyword': 'Added Negative',
    'add_campaign_negative': 'Added Negative',
    'add_adgroup_negative': 'Added Negative',
    'pause_target': 'Paused',
    'enable_target': 'Enabled',
    'set_bid': 'Bid Changed',
    'set_target_bid': 'Bid Changed',
    'create_keyword': 'Keyword Harvested',
    'harvest_keyword': 'Keyword Harvested',
    'st_harvest': 'Keyword Harvested',
    'st_prune': 'Added Negative',
  };
  return labels[actionType] || actionType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Check if action is a harvest (add positive) or prune (add negative) action
const isHarvestAction = (actionType: string): boolean => {
  return ['create_keyword', 'harvest_keyword', 'st_harvest'].includes(actionType);
};

const isPruneAction = (actionType: string): boolean => {
  return ['add_campaign_negative', 'add_adgroup_negative', 'create_negative', 'negative_keyword', 'st_prune'].includes(actionType);
};

// Get source of the action
const getActionSource = (action: ActionItem): { label: string; icon: typeof Bot } => {
  const actionType = action.action_type;
  
  // Check if from bid optimizer
  if (actionType === 'set_bid' || actionType === 'set_target_bid' || actionType === 'set_keyword_bid') {
    if (action.rule_id === null && action.user_id === null) {
      return { label: 'Optimizer', icon: Zap };
    }
  }
  
  // Check if from a rule/playbook
  if (action.rule_id) {
    // Check payload for playbook indicator
    const payload = action.payload as Record<string, any>;
    if (payload?.playbook_id || payload?.source === 'playbook') {
      return { label: 'Playbook', icon: BookOpen };
    }
    return { label: 'Rule', icon: Bot };
  }
  
  // Manual action
  if (action.user_id) {
    return { label: 'Manual', icon: User };
  }
  
  return { label: 'Auto', icon: Bot };
};

// Get status icon and color
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'applied':
      return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Applied' };
    case 'queued':
      return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending' };
    case 'failed':
    case 'skipped':
    case 'prevented':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' };
    default:
      return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
  }
};

// Build tooltip content from action data
const getActionDetails = (action: ActionItem): string[] => {
  const lines: string[] = [];
  
  // Add trigger reason if available
  if (action.trigger_reason) {
    lines.push(action.trigger_reason);
  }
  
  // Add trigger metrics if available
  if (action.trigger_metrics) {
    const m = action.trigger_metrics;
    if (m.acos !== undefined) lines.push(`ACOS: ${Number(m.acos).toFixed(1)}%`);
    if (m.spend !== undefined) lines.push(`Spend: $${Number(m.spend).toFixed(2)}`);
    if (m.clicks !== undefined) lines.push(`Clicks: ${m.clicks}`);
    if (m.conversions !== undefined) lines.push(`Conversions: ${m.conversions}`);
  }
  
  // Add error message for failed actions
  if (action.error) {
    lines.push(`⚠ ${action.error}`);
  }
  
  return lines;
};

const Changelog = () => {
  const [entityFilter, setEntityFilter] = useState<EntityType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revertingAction, setRevertingAction] = useState<string | null>(null);
  
  const { actions, stats, loading, refetch } = useActionsFeed(100);
  const { revertAction, loading: reverting } = useRevertAction();

  // Filter actions
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (entityFilter !== 'all' && getEntityType(action.action_type) !== entityFilter) return false;
      if (statusFilter !== 'all' && action.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const entityName = action.entity_name?.toLowerCase() || '';
        if (!entityName.includes(query)) return false;
      }
      return true;
    });
  }, [actions, entityFilter, statusFilter, searchQuery]);

  // Handle revert
  const handleRevert = async (actionId: string) => {
    setRevertingAction(actionId);
    await revertAction(actionId, 'User reverted from changelog');
    refetch();
    setRevertingAction(null);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Change Log</h1>
            <p className="text-sm text-muted-foreground">
              All changes made to your campaigns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6 text-sm">
          <button onClick={() => setStatusFilter('all')} className={`${statusFilter === 'all' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {stats.total} total
          </button>
          <button onClick={() => setStatusFilter('applied')} className={`flex items-center gap-1.5 ${statusFilter === 'applied' ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
            <CheckCircle2 className="h-4 w-4" />
            {stats.applied} applied
          </button>
          <button onClick={() => setStatusFilter('queued')} className={`flex items-center gap-1.5 ${statusFilter === 'queued' ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            {stats.queued} pending
          </button>
          <button onClick={() => setStatusFilter('failed')} className={`flex items-center gap-1.5 ${statusFilter === 'failed' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            <XCircle className="h-4 w-4" />
            {stats.failed + stats.skipped + stats.prevented} failed
          </button>
        </div>

        {/* Entity Tabs */}
        <Tabs value={entityFilter} onValueChange={(v) => setEntityFilter(v as EntityType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="campaign">Campaigns</TabsTrigger>
            <TabsTrigger value="ad_group">Ad Groups</TabsTrigger>
            <TabsTrigger value="keyword">Keywords</TabsTrigger>
            <TabsTrigger value="target">Targets</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Actions List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : filteredActions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No changes found</p>
              </CardContent>
            </Card>
          ) : (
            filteredActions.map((action) => {
              const statusDisplay = getStatusDisplay(action.status);
              const StatusIcon = statusDisplay.icon;
              const canRevert = action.status === 'applied';
              const details = getActionDetails(action);
              const hasDetails = details.length > 0;
              
              const isHarvest = isHarvestAction(action.action_type);
              const isPrune = isPruneAction(action.action_type);
              const source = getActionSource(action);
              const SourceIcon = source.icon;
              
              const rowContent = (
                <div 
                  className={`flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-default ${
                    isHarvest ? 'border-l-4 border-l-emerald-500' : isPrune ? 'border-l-4 border-l-amber-500' : ''
                  }`}
                >
                  {/* Status Icon */}
                  <div className={`h-8 w-8 rounded-full ${statusDisplay.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Harvest/Prune indicator */}
                      {isHarvest && <Plus className="h-3.5 w-3.5 text-emerald-600" />}
                      {isPrune && <Minus className="h-3.5 w-3.5 text-amber-600" />}
                      <span className="font-medium text-sm">{getActionLabel(action.action_type)}</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {getEntityType(action.action_type).replace('_', ' ')}
                      </Badge>
                      {/* Source indicator */}
                      <Badge variant="secondary" className="text-xs font-normal gap-1">
                        <SourceIcon className="h-3 w-3" />
                        {source.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {action.entity_name || 'Unknown entity'}
                    </p>
                  </div>
                  
                  {/* Time */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                  </span>
                  
                  {/* Undo Button */}
                  {canRevert && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevert(action.id);
                      }}
                      disabled={reverting || revertingAction === action.id}
                      className="shrink-0"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
              
              return hasDetails ? (
                <TooltipProvider key={action.id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {rowContent}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {details.map((line, i) => (
                        <p key={i} className="text-xs">{line}</p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div key={action.id}>{rowContent}</div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Changelog;
