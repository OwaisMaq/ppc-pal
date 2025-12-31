import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { formatDistanceToNow } from "date-fns";
import { LogicChip } from "@/components/ui/LogicChip";
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
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

const ActionsFeed = () => {
  const { actions, loading } = useActionsFeed(15);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return <TrendingUp className="h-4 w-4" />;
      case 'negative_keyword':
      case 'negative_product':
        return <Ban className="h-4 w-4" />;
      case 'pause_target':
        return <XCircle className="h-4 w-4" />;
      case 'set_placement_adjust':
        return <Activity className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return 'Bid Adjustment';
      case 'negative_keyword':
        return 'Negative Keyword';
      case 'negative_product':
        return 'Negative Product';
      case 'pause_target':
        return 'Paused Target';
      case 'set_placement_adjust':
        return 'Placement Adjust';
      case 'create_keyword':
        return 'New Keyword';
      case 'enable_entity':
        return 'Enable Target';
      case 'disable_entity':
        return 'Disable Target';
      default:
        // Convert snake_case to Title Case for unknown types
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

  // Extract logic trigger and action from action data
  const getLogicContext = (action: any) => {
    const { action_type, payload } = action;
    
    switch (action_type) {
      case 'set_bid':
        return {
          trigger: payload.reason || 'Performance threshold',
          action: `Bid → $${payload.new_bid || 'N/A'}`,
          details: `PPC Pal adjusted bid to protect your margin based on ${payload.reason || 'performance metrics'}.`
        };
      case 'negative_keyword':
        return {
          trigger: payload.reason || 'High ACOS',
          action: `Negative: "${payload.keyword_text}"`,
          details: `Added "${payload.keyword_text}" as negative to prevent wasted spend on non-converting traffic.`
        };
      case 'negative_product':
        return {
          trigger: payload.reason || 'Non-converting',
          action: `Exclude ASIN`,
          details: `Excluded ASIN ${payload.asin} from targeting to reduce wasted spend.`
        };
      case 'pause_target':
        return {
          trigger: payload.reason || 'Underperforming',
          action: 'Paused',
          details: `Paused target to protect your budget from continued poor performance.`
        };
      case 'enable_entity':
        return {
          trigger: payload.reason || 'Ready to re-enable',
          action: 'Enable target',
          details: `Re-enabled a previously paused target that is now performing within acceptable thresholds.`
        };
      case 'disable_entity':
        return {
          trigger: payload.reason || 'Performance issue',
          action: 'Disable target',
          details: `Disabled a target to protect your budget from poor performance.`
        };
      default:
        return {
          trigger: 'Rule triggered',
          action: getActionLabel(action_type),
          details: undefined
        };
    }
  };

  const formatActionDetails = (action: any) => {
    const { action_type, payload } = action;
    
    switch (action_type) {
      case 'set_bid':
        return `${payload.entity_name || payload.target_id} → ${payload.new_bid ? `$${payload.new_bid}` : 'N/A'}`;
      case 'negative_keyword':
        return `"${payload.keyword_text}" added to ${payload.campaign_name || 'campaign'}`;
      case 'negative_product':
        return `ASIN ${payload.asin} excluded from ${payload.campaign_name || 'campaign'}`;
      case 'pause_target':
        return `${payload.entity_name || payload.target_id} paused`;
      case 'set_placement_adjust':
        return `${payload.placement} → ${payload.adjustment}%`;
      case 'enable_entity':
        return `Target ${payload.entityId?.slice(-6) || 'ID'} enabled`;
      case 'disable_entity':
        return `Target ${payload.entityId?.slice(-6) || 'ID'} disabled`;
      default:
        // Try to extract meaningful info from payload
        if (payload.entity_name) return payload.entity_name;
        if (payload.keyword_text) return payload.keyword_text;
        if (payload.entityId) return `Target ...${payload.entityId.slice(-6)}`;
        return 'Action completed';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Protection Actions
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
            Protection Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No protection actions taken yet.</p>
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
          Protection Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Actions taken by PPC Pal to protect your margins
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {/* Activity Timeline */}
          <div className="activity-timeline">
            {actions.map((action) => {
              const statusConfig = getStatusConfig(action.status);
              const StatusIcon = statusConfig.icon;
              const logic = getLogicContext(action);
              
              return (
                <div
                  key={action.id}
                  className="activity-item"
                  data-status={action.status === 'applied' ? 'applied' : action.status === 'failed' ? 'error' : undefined}
                >
                  <div className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    {/* Header: Action type & status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md bg-muted", statusConfig.color)}>
                          {getActionIcon(action.action_type)}
                        </div>
                        <span className="text-sm font-medium">
                          {getActionLabel(action.action_type)}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("gap-1 text-xs", statusConfig.color)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    {/* Logic Chip: Explainable reasoning */}
                    <LogicChip 
                      trigger={logic.trigger}
                      action={logic.action}
                      details={logic.details}
                      variant="compact"
                      className="mb-2"
                    />
                    
                    {/* Details */}
                    <p className="text-sm text-muted-foreground">
                      {formatActionDetails(action)}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                    </p>
                  </div>
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
