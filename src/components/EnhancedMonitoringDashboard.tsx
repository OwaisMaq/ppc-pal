import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSyncMonitoring } from '@/hooks/useSyncMonitoring';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const EnhancedMonitoringDashboard = () => {
  const { 
    performanceLogs, 
    connectionHealths, 
    loading, 
    performanceStats, 
    healthSummary,
    runHealthCheck,
    exportPerformanceData,
    refreshData
  } = useSyncMonitoring();
  
  const { connections } = useAmazonConnections();

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of Amazon API sync performance and connection health
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportPerformanceData}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(performanceStats.successRate)}`}>
              {performanceStats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last {performanceStats.totalSyncs} syncs
            </p>
            <Progress 
              value={performanceStats.successRate} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(performanceStats.avgDuration)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average sync time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Processed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats.totalCampaignsProcessed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent sync operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Connections</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthSummary.healthyConnections}/{healthSummary.totalConnections}
            </div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {(healthSummary.degradedConnections > 0 || healthSummary.staleConnections > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {healthSummary.degradedConnections > 0 && (
              <span className="text-yellow-600">
                {healthSummary.degradedConnections} connection(s) have health issues. 
              </span>
            )}
            {healthSummary.staleConnections > 0 && (
              <span className="text-red-600 ml-2">
                {healthSummary.staleConnections} connection(s) haven't synced in over 7 days.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
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
              <div className="space-y-4">
                {performanceLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="font-medium">
                          {log.operation_type} - {log.campaigns_processed} campaigns
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.start_time), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {log.total_duration_ms ? formatDuration(log.total_duration_ms) : 'N/A'}
                      </div>
                      {!log.success && log.error_message && (
                        <div className="text-sm text-red-600">
                          {log.error_message.slice(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {connectionHealths.map((connection) => (
              <Card key={connection.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    {connection.profile_name || 'Amazon Connection'}
                  </CardTitle>
                  <Badge className={getHealthStatusColor(connection.health_status)}>
                    {connection.health_status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Campaigns:</span>
                    <span className="font-medium">{connection.campaign_count}</span>
                  </div>
                  
                  {connection.last_sync_at && (
                    <div className="flex justify-between text-sm">
                      <span>Last Sync:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  
                  {connection.last_health_check && (
                    <div className="flex justify-between text-sm">
                      <span>Health Check:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(connection.last_health_check), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {connection.health_issues && connection.health_issues.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-yellow-600">Issues:</div>
                      {connection.health_issues.map((issue, index) => (
                        <div key={index} className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => runHealthCheck(connection.id)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Zap className="h-3 w-3 mr-2" />
                    Run Health Check
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Error Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceStats.commonErrors.length > 0 ? (
                <div className="space-y-3">
                  {performanceStats.commonErrors.map(([error, count], index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-red-900">{error}</div>
                        <div className="text-sm text-red-600">Occurred {count} time(s)</div>
                      </div>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <div className="text-lg font-medium">No Recent Errors</div>
                  <div className="text-sm">All sync operations completed successfully</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};