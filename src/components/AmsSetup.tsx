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
import { Loader2, Server, Network, Clock, Activity, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_REGION = "eu-west-1";

export default function AmsSetup() {
  const { connections, loading: loadingConnections, refreshConnections } = useAmazonConnections();
  const { loading, list, subscribe, archive, processStreamData } = useAMS();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [destinationArn, setDestinationArn] = useState("");
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [destinationType, setDestinationType] = useState("firehose");
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { metrics } = useAmsMetrics(selectedConnectionId || undefined);
  const { toast } = useToast();

  const activeConnections = useMemo(() => connections.filter(c => c.status === "active"), [connections]);

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
    console.log('toggleDataset called:', { datasetId, enabled, selectedConnectionId, destinationArn });
    if (!selectedConnectionId) return;
    
    if (enabled && !destinationArn) {
      toast({
        title: "Missing Configuration",
        description: "Please enter an AWS Destination ARN before enabling subscriptions",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (enabled) {
        await subscribe({
          connectionId: selectedConnectionId,
          datasetId,
          destinationType: destinationType as any,
          destinationArn,
          region,
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

  const processing = loading || loadingConnections;
  
  // Debug logging
  console.log('AmsSetup Debug:', {
    destinationArn,
    region,
    destinationType,
    processing,
    loading,
    loadingConnections,
    selectedConnectionId,
    activeConnectionsCount: activeConnections.length
  });

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
              const isTokenExpired = selectedConnection && new Date(selectedConnection.token_expires_at) < new Date();
              const hasHealthIssues = selectedConnection?.health_status === 'error' || selectedConnection?.health_issues?.length > 0;
              
              return (isTokenExpired || hasHealthIssues) && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Amazon Connection Issue</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          {isTokenExpired 
                            ? "Your Amazon connection token has expired. Please reconnect your Amazon account to enable AMS streaming."
                            : "There's an issue with your Amazon connection. Please reconnect your Amazon account to enable AMS streaming."
                          }
                        </p>
                        {selectedConnection?.health_issues && selectedConnection.health_issues.length > 0 && (
                          <ul className="mt-2 list-disc list-inside text-xs">
                            {selectedConnection.health_issues.map((issue: string, idx: number) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button 
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.30V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                          </svg>
                          Go to Amazon Account Setup Above
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
                <Button 
                  variant="default" 
                  onClick={handleProcessStreamData}
                  disabled={!selectedConnectionId || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Process Now
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Destination type</Label>
                <Select value={destinationType} onValueChange={setDestinationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firehose">Kinesis Firehose</SelectItem>
                    <SelectItem value="sqs">SQS</SelectItem>
                    <SelectItem value="kinesis">Kinesis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>AWS Destination ARN</Label>
                <Input placeholder="arn:aws:firehose:eu-west-1:123456789012:deliverystream/your-stream" value={destinationArn} onChange={(e) => setDestinationArn(e.target.value)} />
              </div>
              <div>
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eu-west-1">eu-west-1 (Ireland)</SelectItem>
                    <SelectItem value="eu-central-1">eu-central-1 (Frankfurt)</SelectItem>
                    <SelectItem value="eu-west-2">eu-west-2 (London)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Freshness Indicator */}
            {selectedConnectionId && (
              <DataFreshnessIndicator 
                connectionId={selectedConnectionId}
                className="pb-4 border-b border-border/50"
              />
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-3 rounded-md border p-4 transition-colors hover:bg-muted/50">
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
                  <Switch
                    checked={!!subs["sp-traffic"] && subs["sp-traffic"].status !== "archived"}
                    disabled={processing}
                    onCheckedChange={(v) => toggleDataset("sp-traffic", v)}
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
              <div className="flex flex-col space-y-3 rounded-md border p-4 transition-colors hover:bg-muted/50">
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
                  <Switch
                    checked={!!subs["sp-conversion"] && subs["sp-conversion"].status !== "archived"}
                    disabled={processing}
                    onCheckedChange={(v) => toggleDataset("sp-conversion", v)}
                  />
                </div>
                {subs["sp-conversion"] && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={subs["sp-conversion"].status === "active" ? "default" : "secondary"} className="text-xs">
                      {subs["sp-conversion"].status === "active" ? "Streaming" : "Inactive"}
                    </Badge>
                    {subs["sp-conversion"].last_delivery_at && (
                      <span className="text-muted-foreground ml-2">
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
