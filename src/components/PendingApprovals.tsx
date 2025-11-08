import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { 
  AlertCircle,
  TrendingUp, 
  Ban, 
  XCircle,
  Activity,
  DollarSign,
  Check,
  X
} from "lucide-react";

const PendingApprovals = () => {
  const { actions, loading, refetch } = useActionsFeed(50);
  const [processing, setProcessing] = useState<string[]>([]);

  // Filter for queued actions only
  const pendingActions = actions.filter(action => action.status === 'queued');

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

  const handleApprove = async (actionId: string) => {
    setProcessing(prev => [...prev, actionId]);
    try {
      // Update action status to trigger processing
      const { error } = await supabase
        .from('action_queue')
        .update({ status: 'queued' }) // Keep as queued so worker can pick it up
        .eq('id', actionId);

      if (error) throw error;

      // Trigger the actions-worker function
      const { error: workerError } = await supabase.functions.invoke('actions-worker');
      
      if (workerError) throw workerError;

      toast.success('Action approved and processing');
      refetch();
    } catch (error) {
      console.error('Error approving action:', error);
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
        .update({ 
          status: 'skipped',
          error: 'Rejected by user'
        })
        .eq('id', actionId);

      if (error) throw error;

      toast.success('Action rejected');
      refetch();
    } catch (error) {
      console.error('Error rejecting action:', error);
      toast.error('Failed to reject action');
    } finally {
      setProcessing(prev => prev.filter(id => id !== actionId));
    }
  };

  const handleApproveAll = async () => {
    const actionIds = pendingActions.map(a => a.id);
    setProcessing(actionIds);
    
    try {
      // Trigger the actions-worker to process all queued actions
      const { error: workerError } = await supabase.functions.invoke('actions-worker');
      
      if (workerError) throw workerError;

      toast.success(`Approved ${pendingActions.length} actions`);
      refetch();
    } catch (error) {
      console.error('Error approving all actions:', error);
      toast.error('Failed to approve actions');
    } finally {
      setProcessing([]);
    }
  };

  if (loading) return null;
  
  if (pendingActions.length === 0) return null;

  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg text-amber-900 dark:text-amber-100">
              Actions Pending Approval
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {pendingActions.length}
            </Badge>
          </div>
          {pendingActions.length > 1 && (
            <Button
              onClick={handleApproveAll}
              disabled={processing.length > 0}
              size="sm"
              variant="default"
            >
              Approve All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingActions.map((action) => (
            <div
              key={action.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                {getActionIcon(action.action_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getActionLabel(action.action_type)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatActionDetails(action)}
                </p>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(action.id)}
                  disabled={processing.includes(action.id)}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(action.id)}
                  disabled={processing.includes(action.id)}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingApprovals;
