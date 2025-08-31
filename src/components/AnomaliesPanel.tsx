import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Eye, EyeOff } from "lucide-react";
import { useAnomalies, type Anomaly } from "@/hooks/useAnomalies";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_ICONS = {
  info: Activity,
  warn: AlertTriangle,
  critical: AlertTriangle
};

const SEVERITY_COLORS = {
  info: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  warn: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-error/10 text-error border-error/20'
};

const DIRECTION_ICONS = {
  spike: TrendingUp,
  dip: TrendingDown
};

export const AnomaliesPanel = () => {
  const { connections } = useAmazonConnections();
  const { anomalies, loading, fetchAnomalies, updateAnomalyState } = useAnomalies();
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('new');

  const handleFetchAnomalies = () => {
    const filters: any = {};
    if (selectedProfile !== 'all') filters.profileId = selectedProfile;
    if (selectedSeverity !== 'all') filters.severity = selectedSeverity;
    if (selectedState !== 'all') filters.state = selectedState;
    
    fetchAnomalies(filters);
  };

  const handleAcknowledge = async (anomalyId: string) => {
    await updateAnomalyState(anomalyId, 'acknowledged');
  };

  const handleMute = async (anomalyId: string) => {
    await updateAnomalyState(anomalyId, 'muted');
  };

  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'spend':
      case 'sales':
        return `£${value.toFixed(2)}`;
      case 'acos':
      case 'ctr':
      case 'cvr':
        return `${value.toFixed(2)}%`;
      case 'cpc':
        return `£${value.toFixed(3)}`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Anomaly Detection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                {connections.map((conn) => (
                  <SelectItem key={conn.profile_id} value={conn.profile_id!}>
                    {conn.profile_name || conn.profile_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="muted">Muted</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleFetchAnomalies} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {/* Anomalies List */}
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No anomalies found for the selected filters.
              </div>
            ) : (
              anomalies.map((anomaly) => {
                const SeverityIcon = SEVERITY_ICONS[anomaly.severity as keyof typeof SEVERITY_ICONS];
                const DirectionIcon = DIRECTION_ICONS[anomaly.direction as keyof typeof DIRECTION_ICONS];
                
                return (
                  <Card key={anomaly.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <SeverityIcon className="h-4 w-4" />
                              <Badge variant="outline" className={SEVERITY_COLORS[anomaly.severity as keyof typeof SEVERITY_COLORS]}>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <DirectionIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">{anomaly.direction}</span>
                            </div>
                            <Badge variant="secondary">{anomaly.metric}</Badge>
                            <Badge variant="outline">{anomaly.time_window}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Value:</span>
                              <div className="font-semibold">{formatMetricValue(anomaly.value, anomaly.metric)}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Baseline:</span>
                              <div>{formatMetricValue(anomaly.baseline, anomaly.metric)}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Z-Score:</span>
                              <div className="font-mono">{anomaly.score.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {anomaly.entity_id && (
                              <span>Entity: {anomaly.entity_id} • </span>
                            )}
                            <span>Detected {formatDistanceToNow(new Date(anomaly.created_at))} ago</span>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {anomaly.state === 'new' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcknowledge(anomaly.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMute(anomaly.id)}
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Mute
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};