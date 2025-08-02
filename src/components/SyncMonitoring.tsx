import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, Download, PlayCircle, RefreshCw } from "lucide-react";
import { useSyncMonitoring } from "@/hooks/useSyncMonitoring";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

const SyncMonitoring = () => {
  const {
    performanceLogs,
    connectionHealths,
    loading,
    refreshData,
    performanceStats,
    healthSummary,
    runHealthCheck,
    exportPerformanceData
  } = useSyncMonitoring();

  const { connections } = useAmazonConnections();

  const stats = performanceStats;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Monitoring</h2>
          <p className="text-gray-600">Monitor your Amazon API sync performance and connection health</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportPerformanceData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
              {stats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
        <div className="text-2xl font-bold text-blue-600">
          {formatDuration(stats.avgDuration)}
        </div>
            <p className="text-xs text-gray-500">Per sync operation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Campaigns Processed</CardTitle>
          </CardHeader>
          <CardContent>
        <div className="text-2xl font-bold text-purple-600">
          {stats.totalCampaignsProcessed.toLocaleString()}
        </div>
            <p className="text-xs text-gray-500">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Healthy Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthSummary.healthyConnections}/{healthSummary.totalConnections}
            </div>
            <p className="text-xs text-gray-500">Active connections</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Issues Alert */}
      {(healthSummary.degradedConnections > 0 || healthSummary.staleConnections > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Connection Health Issues Detected
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {healthSummary.degradedConnections > 0 && `${healthSummary.degradedConnections} degraded connection(s). `}
              {healthSummary.staleConnections > 0 && `${healthSummary.staleConnections} stale connection(s).`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Monitoring */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance Logs</TabsTrigger>
          <TabsTrigger value="health">Connection Health</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Operations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading performance logs...</p>
              ) : performanceLogs.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No sync operations found</p>
              ) : (
                <div className="space-y-3">
                  {performanceLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {log.operation_type === 'sync' ? 'Data Sync' : 'Health Check'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.start_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.success ? "default" : "destructive"} className="mb-1">
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          {log.total_duration_ms ? formatDuration(log.total_duration_ms) : 'N/A'}
                        </p>
                        {log.campaigns_processed !== undefined && (
                          <p className="text-xs text-gray-500">
                            {log.campaigns_processed} campaigns
                          </p>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Amazon Connection Health</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading connection health...</p>
              ) : connectionHealths.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No connections found</p>
              ) : (
                <div className="space-y-3">
                  {connectionHealths.map((health) => (
                    <div key={health.profile_name} className={`p-4 rounded-lg border ${getHealthStatusColor(health.health_status)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{health.profile_name}</h4>
                          <p className="text-sm text-gray-600">
                            Last sync: {health.last_sync_at ? new Date(health.last_sync_at).toLocaleString() : 'Never'}
                          </p>
                          {health.health_issues && health.health_issues.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-red-600">Issues:</p>
                              <ul className="text-sm text-red-600 ml-4">
                                {health.health_issues.map((issue, index) => (
                                  <li key={index}>• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getHealthStatusColor(health.health_status)}>
                            {health.health_status}
                          </Badge>
                          {connections.find(c => c.profile_name === health.profile_name) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runHealthCheck(connections.find(c => c.profile_name === health.profile_name)!.id)}
                              className="flex items-center gap-1"
                            >
                              <PlayCircle className="h-4 w-4" />
                              Check
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Loading error analysis...</p>
              ) : (
                <div className="space-y-3">
                  {stats.commonErrors.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">No errors found in recent operations</p>
                  ) : (
                    stats.commonErrors.map(([error, count], index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-red-800">{error}</span>
                          <Badge variant="destructive">{count} occurrences</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyncMonitoring;