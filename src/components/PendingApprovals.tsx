import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/automation";
import { 
  ClipboardCheck,
  TrendingUp, 
  Ban, 
  XCircle,
  Activity,
  DollarSign,
  Check,
  X,
  Loader2,
  RotateCcw,
  Pause
} from "lucide-react";

const PendingApprovals = () => {
  const { actions, loading, refetch } = useActionsFeed(50);
  const [processing, setProcessing] = useState<string[]>([]);

  // Show both queued (awaiting approval) and skipped (blocked/can retry) actions
  const pendingActions = actions.filter(action => 
    action.status === 'queued' || 
    (action.status === 'skipped' && action.error !== 'User rejected')
  );

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'set_bid':
        return TrendingUp;
      case 'negative_keyword':
      case 'negative_product':
        return Ban;
      case 'pause_target':
        return Pause;
      case 'set_placement_adjust':
        return Activity;
      default:
        return DollarSign;
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
        return 'Pause Target';
      case 'set_placement_adjust':
        return 'Placement Adjustment';
      case 'create_keyword':
        return 'New Keyword';
      default:
        return actionType;
    }
  };

  const formatActionDetails = (action: any) => {
    const { action_type, payload } = action;
    
    switch (action_type) {
      case 'set_bid':
        return `${payload.entity_name || payload.target_id} → ${payload.new_bid ? `$${payload.new_bid}` : 'N/A'}`;
      case 'negative_keyword':
        return `"${payload.keyword_text}" to ${payload.campaign_name || 'campaign'}`;
      case 'negative_product':
        return `ASIN ${payload.asin} from ${payload.campaign_name || 'campaign'}`;
      case 'pause_target':
        return `${payload.entity_name || payload.target_id}`;
      case 'set_placement_adjust':
        return `${payload.placement} → ${payload.adjustment}%`;
      default:
        return JSON.stringify(payload).substring(0, 50);
    }
  };

  // Extract confidence data from action payload (for Bayesian bid actions)
  const getConfidenceData = (action: any) => {
    const { payload } = action;
    if (payload?.confidence !== undefined) {
      return {
        confidence: Math.round(payload.confidence * 100),
      };
    }
    return null;
  };

  // Check if action is from Bayesian optimizer
  const isBayesianAction = (action: any) => {
    return action.payload?.source === 'bayesian_optimizer' || 
           action.payload?.confidence !== undefined;
  };

  const handleApprove = async (actionId: string) => {
    setProcessing(prev => [...prev, actionId]);
    try {
      // First update status to queued if it was skipped
      const action = pendingActions.find(a => a.id === actionId);
      if (action?.status === 'skipped') {
        const { error: updateError } = await supabase
          .from('action_queue')
          .update({ status: 'queued', error: null })
          .eq('id', actionId);
        
        if (updateError) throw updateError;
      }
      
      // Invoke the actions worker to process this action
      const { error } = await supabase.functions.invoke('actions-worker', {
        body: { action_id: actionId }
      });
      
      if (error) throw error;
      
      toast.success('Action approved and applied');
      refetch();
    } catch (err) {
      console.error('Failed to approve action:', err);
      toast.error('Failed to approve action');
    } finally {
      setProcessing(prev => prev.filter(id => id !== actionId));
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessing(prev => [...prev, actionId]);
    try {
      const { error } = await supabase
        .from('action_queue')
        .update({ status: 'skipped', error: 'User rejected' })
        .eq('id', actionId);
      
      if (error) throw error;
      
      toast.success('Action rejected');
      refetch();
    } catch (err) {
      console.error('Failed to reject action:', err);
      toast.error('Failed to reject action');
    } finally {
      setProcessing(prev => prev.filter(id => id !== actionId));
    }
  };

  const handleApproveAll = async () => {
    const actionIds = pendingActions.map(a => a.id);
    setProcessing(actionIds);
    
    const queuedActions = pendingActions.filter(a => a.status === 'queued');
    if (queuedActions.length === 0) return;
    
    try {
      const { error } = await supabase.functions.invoke('actions-worker', {
        body: { approve_all: true }
      });
      
      if (error) throw error;
      
      toast.success(`${queuedActions.length} actions approved`);
      refetch();
    } catch (err) {
      console.error('Failed to approve all actions:', err);
      toast.error('Failed to approve all actions');
    }
  };

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

  if (pendingActions.length === 0) {
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

  const queuedCount = pendingActions.filter(a => a.status === 'queued').length;
  const skippedCount = pendingActions.filter(a => a.status === 'skipped').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Pending Approvals
              <Badge variant="secondary" className="ml-2">
                {pendingActions.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {queuedCount > 0 && `${queuedCount} awaiting approval`}
              {queuedCount > 0 && skippedCount > 0 && ' · '}
              {skippedCount > 0 && `${skippedCount} blocked`}
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
        {pendingActions.slice(0, 5).map((action) => {
          const Icon = getActionIcon(action.action_type);
          const isProcessing = processing.includes(action.id);
          const bayesianData = isBayesianAction(action) ? getConfidenceData(action) : null;
          const isSkipped = action.status === 'skipped';
          
          return (
            <div 
              key={action.id} 
              className={`flex items-start justify-between p-3 rounded-lg border ${
                isSkipped ? 'bg-muted/50 border-muted' : 'bg-background'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${isSkipped ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Icon className={`h-4 w-4 ${isSkipped ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {getActionLabel(action.action_type)}
                    </p>
                    {isSkipped && (
                      <Badge variant="outline" className="text-xs">
                        Blocked
                      </Badge>
                    )}
                    {bayesianData && (
                      <ConfidenceBadge 
                        confidence={bayesianData.confidence} 
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatActionDetails(action)}
                  </p>
                  {isSkipped && action.error && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {action.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(action.id)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-600/10"
                  onClick={() => handleApprove(action.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSkipped ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
        {pendingActions.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{pendingActions.length - 5} more actions
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovals;
