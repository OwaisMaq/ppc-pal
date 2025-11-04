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
import { Loader2, Server, Network, Clock, Activity, Zap, Database } from "lucide-react";
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
  const [snsTopicArn, setSnsTopicArn] = useState<string>("arn:aws:sns:eu-west-1:229742714366:ppcpal-ams-notifications-eu");
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
    console.log('🔄 toggleDataset called:', { datasetId, enabled, selectedConnectionId });
    
    if (!selectedConnectionId) {
      console.error('❌ No connection selected');
      toast({
        title: "Error",
        description: "Please select a connection first",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      if (enabled) {
        console.log('📡 Subscribing to dataset:', datasetId);
        const result = await subscribe({
          connectionId: selectedConnectionId,
          datasetId,
          snsTopicArn: snsTopicArn || undefined
        });
        console.log('✅ Subscribe result:', result);
        
        toast({
          title: "Subscription activated",
          description: `${datasetId} data stream is now active with your SNS topic`,
        });
      } else {
        const sub = subs[datasetId];
        console.log('🗑️ Archiving subscription:', sub);
        if (sub?.subscription_id) {
          const result = await archive({ connectionId: selectedConnectionId, subscriptionId: sub.subscription_id });
          console.log('✅ Archive result:', result);
          toast({
            title: "Subscription archived", 
            description: `${datasetId} data stream has been stopped`,
          });
        } else {
          console.warn('⚠️ No subscription_id found for dataset:', datasetId);
        }
      }
      // Refresh subscriptions
      console.log('🔄 Refreshing subscription list...');
      const rows = await list(selectedConnectionId);
      const byDataset: Record<string, any> = {};
      rows.forEach(r => { byDataset[r.dataset_id] = r; });
      setSubs(byDataset);
      console.log('✅ Subscriptions refreshed:', byDataset);
    } catch (error: any) {
      console.error('❌ Toggle error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  const handleProcessS3Data = async () => {
    if (!selectedConnectionId) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ams-s3-processor', {
        body: { connectionId: selectedConnectionId }
      });

      if (error) throw error;

      toast({
        title: "S3 Processing Complete",
        description: `Processed ${data?.processedFiles || 0} files with ${data?.totalRecords || 0} records`,
      });
    } catch (error: any) {
      toast({
        title: "S3 Processing Failed",
        description: error.message || "Failed to process S3 data",
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
              <div className="flex items-end gap-2 flex-wrap">
                <Button variant="outline" onClick={refreshConnections} disabled={processing} size="sm">
                  Refresh
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={!selectedConnectionId || isProcessing}
                  size="sm"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Refresh Token
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleProcessS3Data}
                  disabled={!selectedConnectionId || isProcessing}
                  size="sm"
                  className="gap-2"
                >
                  <Database className="h-4 w-4" />
                  Process S3
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

            {/* SNS Topic ARN Configuration */}
            <Card className="p-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sns-topic-arn" className="text-sm font-medium">SNS Topic ARN</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Your Amazon SNS topic ARN. Amazon Marketing Stream will publish data to this topic.
                  </p>
                </div>
                <Input
                  id="sns-topic-arn"
                  value={snsTopicArn}
                  onChange={(e) => setSnsTopicArn(e.target.value)}
                  placeholder="arn:aws:sns:region:account:topic-name"
                  className="font-mono text-sm"
                />
              </div>
            </Card>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-medium text-blue-800">Real-time Streaming via S3</h3>
                  <p className="text-sm text-blue-700">
                    Enable streaming subscriptions below to receive hourly updates for clicks, impressions, cost, and conversions from Amazon.
                  </p>
                  <div className="bg-white/60 rounded p-3 text-xs space-y-1 text-blue-900">
                    <p className="font-medium">📋 Quick Setup Required:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Create an S3 bucket in your AWS account (e.g., <code className="bg-blue-100 px-1 py-0.5 rounded">ppcpal-ams-data-eu</code>)</li>
                      <li>Add bucket policy to allow Amazon Marketing Stream write access</li>
                      <li>Create IAM credentials for PPC Pal to read files</li>
                      <li>Update Supabase secrets with your S3 bucket ARN</li>
                    </ol>
                    <p className="mt-2 pt-2 border-t border-blue-200">
                      <a 
                        href="https://github.com/yourusername/ppcpal/blob/main/infra/ams-s3/S3_SETUP_GUIDE.md" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View Complete S3 Setup Guide →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      sp-traffic
                      {subs["sp-traffic"]?.status === "active" && (
                        <Badge variant="secondary" className="h-4 text-xs">Active</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Impressions, clicks, cost (hourly)</p>
                  </div>
                   <Switch 
                    checked={subs["sp-traffic"]?.status === "active"}
                    onCheckedChange={(checked) => {
                      console.log('🎯 Switch clicked for sp-traffic:', checked);
                      toggleDataset("sp-traffic", checked);
                    }}
                    disabled={processing || isProcessing}
                  />
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
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      sp-conversion
                      {subs["sp-conversion"]?.status === "active" && (
                        <Badge variant="secondary" className="h-4 text-xs">Active</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Attributed conversions and sales (hourly)</p>
                  </div>
                   <Switch 
                    checked={subs["sp-conversion"]?.status === "active"}
                    onCheckedChange={(checked) => {
                      console.log('🎯 Switch clicked for sp-conversion:', checked);
                      toggleDataset("sp-conversion", checked);
                    }}
                    disabled={processing || isProcessing}
                  />
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
