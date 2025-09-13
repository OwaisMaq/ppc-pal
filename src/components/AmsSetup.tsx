import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAMS, AmsDataset } from "@/hooks/useAMS";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { DataFreshnessIndicator } from "@/components/DataFreshnessIndicator";
import { ConnectionStatusAlert } from "@/components/ConnectionStatusAlert";
import { Loader2, Server, Network, Clock, Activity, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_REGION = "eu-west-1";

export default function AmsSetup() {
  const { connections, loading: loadingConnections, refreshConnections, refreshConnection, initiateConnection } = useAmazonConnections();
  const { loading, list, subscribe, archive, processStreamData } = useAMS();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { metrics } = useAmsMetrics(selectedConnectionId || undefined);
  const { toast } = useToast();

  const activeConnections = useMemo(() => connections.filter(c => {
    const status = typeof c?.status === 'string' ? c.status.toLowerCase().trim() : String(c?.status ?? '');
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return tokenOk && (status === 'active' || status === 'setup_required' || status === 'pending');
  }), [connections]);

  useEffect(() => {
    if (!selectedConnectionId && activeConnections[0]?.id) {
      setSelectedConnectionId(activeConnections[0].id);
    }
  }, [activeConnections, selectedConnectionId]);

  useEffect(() => {
    (async () => {
      if (!selectedConnectionId) return;
      const rows = await list(selectedConnectionId);
      const byDataset: Record<string, any> = {};
      rows.forEach(r => { byDataset[r.dataset_id] = r; });
      setSubs(byDataset);
    })();
  }, [selectedConnectionId, list]);

  const toggleDataset = async (datasetId: AmsDataset, enabled: boolean) => {
    console.log('toggleDataset called:', { datasetId, enabled, selectedConnectionId });
    if (!selectedConnectionId) return;
    
    try {
      if (enabled) {
        // Use managed SQS - no ARN required
        await subscribe({
          connectionId: selectedConnectionId,
          datasetId
        });
        toast({
          title: "Subscription activated",
          description: `${datasetId} data stream is now active`,
        });
      } else {
        const sub = subs[datasetId];
        if (sub?.subscription_id) {
          await archive({ connectionId: selectedConnectionId, subscriptionId: sub.subscription_id });
          toast({
            title: "Subscription archived", 
            description: `${datasetId} data stream has been stopped`,
          });
        }
      }
      const rows = await list(selectedConnectionId);
      const byDataset: Record<string, any> = {};
      rows.forEach(r => { byDataset[r.dataset_id] = r; });
      setSubs(byDataset);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    }
  };

  const handleRefreshToken = async () => {
    if (!selectedConnectionId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { connectionId: selectedConnectionId }
      });
      if (error) throw error;
      toast({
        title: "Token refreshed",
        description: "Amazon connection token has been refreshed successfully",
      });
      // Refresh connections to update the UI
      refreshConnections();
    } catch (error: any) {
      toast({
        title: "Token refresh failed",
        description: error.message || "Failed to refresh Amazon token",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessStreamData = async () => {
    console.log('handleProcessStreamData called:', { selectedConnectionId });
    if (!selectedConnectionId) return;
    setIsProcessing(true);
    try {
      await processStreamData(selectedConnectionId);
      toast({
        title: "Processing complete",
        description: "Stream data has been aggregated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process stream data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestDelivery = async () => {
    if (!selectedConnectionId) return;
    setIsProcessing(true);
    try {
      // Send synthetic test data to ams-ingest
      const testTrafficData = [{
        connection_id: selectedConnectionId,
        profile_id: 'test-profile',
        hour_start: new Date().toISOString(),
        campaign_id: 'test-campaign-123',
        ad_group_id: 'test-adgroup-456',
        impressions: 100,
        clicks: 5,
        cost: 2.50
      }];

      const { error: ingestError } = await supabase.functions.invoke('ams-ingest', {
        body: {
          dataset: 'sp-traffic',
          messages: testTrafficData,
          connection_id: selectedConnectionId
        }
      });

      if (ingestError) throw ingestError;

      // Process the test data
      await processStreamData(selectedConnectionId);

      toast({
        title: "Test delivery successful",
        description: "Synthetic data delivered and processed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Test delivery failed", 
        description: error.message || "Failed to test data delivery",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processing = loading || loadingConnections;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" /> Amazon Marketing Stream (SP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeConnections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active Amazon connections found.</p>
        ) : !selectedConnectionId ? (
          <p className="text-sm text-muted-foreground">Select a connection to continue.</p>
        ) : (
          <>
            {(() => {
              const selectedConnection = activeConnections.find(c => c.id === selectedConnectionId);
              return selectedConnection && (
                <ConnectionStatusAlert 
                  connection={selectedConnection}
                  onRefresh={async () => {
                    setIsProcessing(true);
                    try {
                      await refreshConnection(selectedConnection.id);
                      await refreshConnections();
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  onReconnect={async () => {
                    await initiateConnection();
                  }}
                  loading={isProcessing}
                />
              );
            })()}
            <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Connection</Label>
                <Select value={selectedConnectionId ?? undefined} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeConnections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.profile_name || c.profile_id} ({c.marketplace_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={refreshConnections} disabled={processing}>
                  Refresh
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={!selectedConnectionId || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Refresh Token
                </Button>
              </div>
            </div>

            {/* Data Freshness Indicator */}
            {selectedConnectionId && (
              <DataFreshnessIndicator 
                connectionId={selectedConnectionId}
                className="pb-4 border-b border-border/50"
              />
            )}

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Server className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Automated Real-time Streaming</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Real-time data streams are automatically activated when you connect your Amazon account. Both traffic and conversion data are streamed and processed automatically every hour.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      sp-traffic
                      {subs["sp-traffic"]?.status === "active" && (
                        <Badge variant="secondary" className="h-4 text-xs">Active</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Impressions, clicks, cost (hourly)</p>
                  </div>
                  <Badge variant={subs["sp-traffic"]?.status === "active" ? "default" : "secondary"}>
                    {subs["sp-traffic"]?.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {subs["sp-traffic"] && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span>Messages (24h): {metrics?.messageCount24h || 0}</span>
                    {metrics?.lastMessageAt && (
                      <>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>Last: {formatDistanceToNow(new Date(metrics.lastMessageAt), { addSuffix: true })}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      sp-conversion
                      {subs["sp-conversion"]?.status === "active" && (
                        <Badge variant="secondary" className="h-4 text-xs">Active</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Attributed conversions and sales (hourly)</p>
                  </div>
                  <Badge variant={subs["sp-conversion"]?.status === "active" ? "default" : "secondary"}>
                    {subs["sp-conversion"]?.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {subs["sp-conversion"] && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {subs["sp-conversion"].last_delivery_at && (
                      <span>
                        Last delivery: {formatDistanceToNow(new Date(subs["sp-conversion"].last_delivery_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

             {processing && (
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Loader2 className="h-4 w-4 animate-spin" /> Working...
               </div>
             )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
