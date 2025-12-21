import { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActionQueue } from '@/hooks/useActionQueue';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Play, RefreshCw, Plus, Terminal, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_TYPES = [
  { value: 'pause_campaign', label: 'Pause Campaign' },
  { value: 'enable_campaign', label: 'Enable Campaign' },
  { value: 'update_campaign_budget', label: 'Update Campaign Budget' },
  { value: 'create_keyword', label: 'Create Keyword' },
  { value: 'pause_keyword', label: 'Pause Keyword' },
  { value: 'enable_keyword', label: 'Enable Keyword' },
  { value: 'set_keyword_bid', label: 'Set Keyword Bid' },
  { value: 'add_negative_keyword', label: 'Add Negative Keyword' },
  { value: 'add_campaign_negative', label: 'Add Campaign Negative' },
  { value: 'pause_target', label: 'Pause Target' },
  { value: 'enable_target', label: 'Enable Target' },
  { value: 'set_target_bid', label: 'Set Target Bid' },
  { value: 'pause_adgroup', label: 'Pause Ad Group' },
  { value: 'enable_adgroup', label: 'Enable Ad Group' },
  { value: 'set_adgroup_bid', label: 'Set Ad Group Default Bid' },
  { value: 'set_placement_adjust', label: 'Set Placement Adjustment' },
];

const PLACEHOLDER_RULE_ID = '00000000-0000-0000-0000-000000000000';

export default function DevTools() {
  const { connections } = useAmazonConnections();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const { actions, loading, refetch, insertAction, triggerWorker } = useActionQueue(selectedProfileId || undefined);
  
  const [actionType, setActionType] = useState('pause_campaign');
  const [payloadJson, setPayloadJson] = useState('{\n  "campaign_id": "",\n  "campaign_name": "Test Campaign"\n}');
  const [isInserting, setIsInserting] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Set default profile when connections load
  useEffect(() => {
    if (connections.length > 0 && !selectedProfileId) {
      setSelectedProfileId(connections[0].profile_id);
    }
  }, [connections, selectedProfileId]);

  // Update payload template when action type changes
  useEffect(() => {
    const templates: Record<string, object> = {
      pause_campaign: { campaign_id: '', campaign_name: 'Test Campaign' },
      enable_campaign: { campaign_id: '', campaign_name: 'Test Campaign' },
      update_campaign_budget: { campaign_id: '', campaign_name: 'Test', budget_micros: 10000000 },
      create_keyword: { ad_group_id: '', campaign_id: '', keyword_text: 'test keyword', match_type: 'BROAD', bid_micros: 500000 },
      pause_keyword: { keyword_id: '' },
      enable_keyword: { keyword_id: '' },
      set_keyword_bid: { keyword_id: '', bid_micros: 500000 },
      add_negative_keyword: { ad_group_id: '', campaign_id: '', keyword_text: 'negative term', match_type: 'EXACT' },
      add_campaign_negative: { campaign_id: '', keyword_text: 'negative term', match_type: 'EXACT' },
      pause_target: { target_id: '' },
      enable_target: { target_id: '' },
      set_target_bid: { target_id: '', bid_micros: 500000 },
      pause_adgroup: { ad_group_id: '', campaign_id: '' },
      enable_adgroup: { ad_group_id: '', campaign_id: '' },
      set_adgroup_bid: { ad_group_id: '', campaign_id: '', default_bid_micros: 500000 },
      set_placement_adjust: { campaign_id: '', placement: 'placementTop', percentage: 50 },
    };
    setPayloadJson(JSON.stringify(templates[actionType] || {}, null, 2));
  }, [actionType]);

  const handleInsertAction = async () => {
    if (!selectedProfileId) {
      return;
    }
    
    setIsInserting(true);
    try {
      const payload = JSON.parse(payloadJson);
      await insertAction({
        action_type: actionType,
        payload,
        profile_id: selectedProfileId,
        rule_id: PLACEHOLDER_RULE_ID
      });
    } catch (err) {
      // Error is handled in hook
    } finally {
      setIsInserting(false);
    }
  };

  const handleTriggerWorker = async () => {
    setIsTriggering(true);
    try {
      await triggerWorker();
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Queued</Badge>;
      case 'applied':
        return <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" /> Applied</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="gap-1">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Developer Tools</h1>
            <p className="text-muted-foreground">Test Amazon API actions and monitor the action queue</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.profile_id}>
                    {conn.profile_name || conn.profile_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Insert Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Insert Test Action
              </CardTitle>
              <CardDescription>
                Queue a manual action for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payload (JSON)</Label>
                <Textarea 
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                  placeholder='{"campaign_id": "..."}'
                />
              </div>

              <Button 
                onClick={handleInsertAction} 
                disabled={isInserting || !selectedProfileId}
                className="w-full"
              >
                {isInserting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Inserting...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Queue Action</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Trigger Worker Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Actions Worker
              </CardTitle>
              <CardDescription>
                Manually trigger the actions-worker edge function
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  The actions-worker processes queued actions and executes them against the Amazon Advertising API.
                  It runs automatically on a schedule, but you can trigger it manually for testing.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleTriggerWorker} 
                  disabled={isTriggering}
                  className="flex-1"
                >
                  {isTriggering ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Run Worker</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Queued actions:</span>{' '}
                {actions.filter(a => a.status === 'queued').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Queue Table */}
        <Card>
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <CardDescription>
              Recent actions and their execution status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No actions in queue. Insert a test action above.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Response / Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div className="font-medium">{action.action_type}</div>
                          <div className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                            {JSON.stringify(action.payload)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(action.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {action.amazon_request_id || '—'}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {action.error ? (
                            <span className="text-destructive text-sm">{action.error}</span>
                          ) : action.amazon_api_response ? (
                            <pre className="text-xs font-mono bg-muted p-1 rounded max-h-[60px] overflow-auto">
                              {JSON.stringify(action.amazon_api_response, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
