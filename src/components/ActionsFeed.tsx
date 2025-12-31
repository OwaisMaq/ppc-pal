import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActionsFeed, ActionItem } from "@/hooks/useActionsFeed";
import { formatDistanceToNow } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  Ban, 
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Lightbulb,
  Plus,
  Pause,
  Play,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ActionsFeed = () => {
  const { actions, loading } = useActionsFeed(15);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return <TrendingUp className="h-4 w-4" />;
      case 'negative_keyword':
      case 'negative_product':
      case 'add_campaign_negative':
      case 'add_adgroup_negative':
        return <Ban className="h-4 w-4" />;
      case 'pause_target':
      case 'pause_campaign':
      case 'disable_entity':
        return <Pause className="h-4 w-4" />;
      case 'enable_entity':
        return <Play className="h-4 w-4" />;
      case 'create_keyword':
        return <Plus className="h-4 w-4" />;
      case 'set_placement_adjust':
        return <Activity className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return 'Bid Adjustment';
      case 'negative_keyword':
      case 'add_campaign_negative':
      case 'add_adgroup_negative':
        return 'Negative Keyword';
      case 'negative_product':
        return 'Negative Product';
      case 'pause_target':
        return 'Paused Target';
      case 'pause_campaign':
        return 'Paused Campaign';
      case 'set_placement_adjust':
        return 'Placement Adjust';
      case 'create_keyword':
        return 'New Keyword';
      case 'enable_entity':
        return 'Re-enabled';
      case 'disable_entity':
        return 'Disabled';
      default:
        return actionType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'applied':
        return { 
          icon: CheckCircle2, 
          label: 'Applied', 
          color: 'text-success',
          dotColor: 'bg-success'
        };
      case 'queued':
        return { 
          icon: Clock, 
          label: 'Queued', 
          color: 'text-muted-foreground',
          dotColor: 'bg-muted-foreground'
        };
      case 'failed':
        return { 
          icon: XCircle, 
          label: 'Failed', 
          color: 'text-error',
          dotColor: 'bg-error'
        };
      case 'skipped':
        return { 
          icon: Lightbulb, 
          label: 'Suggested', 
          color: 'text-info',
          dotColor: 'bg-info'
        };
      case 'prevented':
      case 'rejected':
        return { 
          icon: XCircle, 
          label: 'Not Applied', 
          color: 'text-warning',
          dotColor: 'bg-warning'
        };
      default:
        return { 
          icon: Activity, 
          label: status, 
          color: 'text-muted-foreground',
          dotColor: 'bg-muted-foreground'
        };
    }
  };

  // Format the main display text for an action
  const formatActionDisplay = (action: ActionItem) => {
    const payload = action.payload as Record<string, any>;
    
    // Use enriched entity_name if available
    const entityName = action.entity_name || payload.entity_name;
    const triggerReason = action.trigger_reason || payload.reason;
    
    return {
      entityName: entityName || 'Unknown entity',
      triggerReason: triggerReason || getDefaultTriggerReason(action.action_type),
      impact: action.estimated_impact || payload.estimated_impact
    };
  };

  const getDefaultTriggerReason = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return 'Performance threshold triggered';
      case 'negative_keyword':
      case 'add_campaign_negative':
      case 'add_adgroup_negative':
        return 'Non-converting traffic detected';
      case 'pause_target':
      case 'pause_campaign':
        return 'Underperforming';
      case 'create_keyword':
        return 'Converting search term found';
      case 'enable_entity':
        return 'Performance recovered';
      case 'disable_entity':
        return 'Performance issue';
      default:
        return 'Rule triggered';
    }
  };

  // Format trigger metrics for display
  const formatMetrics = (action: ActionItem) => {
    const metrics = action.trigger_metrics || (action.payload as Record<string, any>).trigger_metrics;
    if (!metrics) return null;

    const parts: string[] = [];
    
    if (metrics.acos !== undefined) {
      parts.push(`ACOS: ${metrics.acos.toFixed(1)}%`);
    }
    if (metrics.roas !== undefined) {
      parts.push(`ROAS: ${metrics.roas.toFixed(2)}x`);
    }
    if (metrics.spend !== undefined) {
      parts.push(`Spend: $${metrics.spend.toFixed(2)}`);
    }
    if (metrics.sales !== undefined) {
      parts.push(`Sales: $${metrics.sales.toFixed(2)}`);
    }
    if (metrics.clicks !== undefined) {
      parts.push(`Clicks: ${metrics.clicks}`);
    }
    if (metrics.conversions !== undefined) {
      parts.push(`Conversions: ${metrics.conversions}`);
    }
    if (metrics.usage_percent !== undefined) {
      parts.push(`Budget used: ${metrics.usage_percent.toFixed(0)}%`);
    }

    return parts.length > 0 ? parts : null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <p className="text-xs text-muted-foreground mt-1">PPC Pal will act when your rules trigger.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Actions taken by PPC Pal to protect your margins
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {actions.map((action) => {
              const statusConfig = getStatusConfig(action.status);
              const StatusIcon = statusConfig.icon;
              const display = formatActionDisplay(action);
              const metrics = formatMetrics(action);
              
              return (
                <div
                  key={action.id}
                  className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Header: Action type, entity name & status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className={cn("p-1.5 rounded-md bg-muted shrink-0", statusConfig.color)}>
                        {getActionIcon(action.action_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {getActionLabel(action.action_type)}
                          </span>
                        </div>
                        {/* Entity name - prominently displayed */}
                        <p className="text-sm font-medium text-foreground truncate mt-0.5" title={display.entityName}>
                          {display.entityName}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("gap-1 text-xs shrink-0", statusConfig.color)}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  {/* Trigger reason */}
                  <p className="text-sm text-muted-foreground mb-1">
                    {display.triggerReason}
                  </p>

                  {/* Metrics tooltip */}
                  {metrics && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded cursor-help">
                          <Activity className="h-3 w-3" />
                          <span>View metrics</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-xs">
                        <div className="space-y-1">
                          {metrics.map((metric, i) => (
                            <p key={i} className="text-xs">{metric}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Impact (if available) */}
                  {display.impact && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {display.impact}
                    </p>
                  )}
                  
                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActionsFeed;
