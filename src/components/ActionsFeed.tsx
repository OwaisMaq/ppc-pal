import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { formatDistanceToNow } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  Ban, 
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";

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
      default:
        return actionType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Applied</Badge>;
      case 'queued':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Queued</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      default:
        return JSON.stringify(payload).substring(0, 50);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions Taken by AI</CardTitle>
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
          <CardTitle className="text-lg">Actions Taken by AI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No actions taken yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions Taken by AI</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                  {getActionIcon(action.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {getActionLabel(action.action_type)}
                    </span>
                    {getStatusBadge(action.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatActionDetails(action)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActionsFeed;
