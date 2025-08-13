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
        ) : (
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
                    disabled={processing || !destinationArn}
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
                    disabled={processing || !destinationArn}
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
        )}
      </CardContent>
    </Card>
  );
}
