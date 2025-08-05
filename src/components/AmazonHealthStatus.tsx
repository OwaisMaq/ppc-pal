import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  Zap
} from "lucide-react";
import { format } from "date-fns";

interface HealthIssue {
  type: 'permission' | 'token' | 'api' | 'config';
  severity: 'error' | 'warning' | 'info';
  message: string;
  resolution?: string;
  actionUrl?: string;
}

interface ConnectionHealth {
  connectionId: string;
  profileName: string;
  marketplace: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastCheck: string;
  tokenExpiry: string;
  issues: HealthIssue[];
  apiEndpoint: string;
}

interface AmazonHealthStatusProps {
  connections: any[];
  onHealthCheck: (connectionId?: string) => void;
  onRefreshToken: (connectionId: string) => void;
  loading?: boolean;
}

const AmazonHealthStatus = ({ connections, onHealthCheck, onRefreshToken, loading }: AmazonHealthStatusProps) => {
  const parseHealthIssues = (issues: string[]): HealthIssue[] => {
    return issues.map(issue => {
      if (issue.includes('403') || issue.includes('permission')) {
        return {
          type: 'permission',
          severity: 'error',
          message: issue,
          resolution: 'Check Amazon Advertising Console for API access approval',
          actionUrl: 'https://advertising.amazon.com/API/docs/en-us/get-started/overview'
        };
      }
      if (issue.includes('401') || issue.includes('token')) {
        return {
          type: 'token',
          severity: 'error',
          message: issue,
          resolution: 'Refresh access token or reconnect account'
        };
      }
      if (issue.includes('API') || issue.includes('endpoint')) {
        return {
          type: 'api',
          severity: 'warning',
          message: issue,
          resolution: 'Check API endpoint and retry connection'
        };
      }
      return {
        type: 'config',
        severity: 'info',
        message: issue,
        resolution: 'Review connection configuration'
      };
    });
  };

  const getConnectionHealth = (connection: any): ConnectionHealth => {
    const issues = connection.health_issues ? parseHealthIssues(connection.health_issues) : [];
    
    let status: 'healthy' | 'degraded' | 'error' | 'unknown' = 'unknown';
    if (connection.health_status) {
      status = connection.health_status;
    } else if (issues.length > 0) {
      status = issues.some(i => i.severity === 'error') ? 'error' : 'degraded';
    }

    return {
      connectionId: connection.id,
      profileName: connection.profile_name,
      marketplace: connection.marketplace_id,
      status,
      lastCheck: connection.last_health_check || 'Never',
      tokenExpiry: connection.token_expires_at,
      issues,
      apiEndpoint: connection.advertising_api_endpoint || 'Unknown'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isTokenExpiringSoon = (tokenExpiry: string): boolean => {
    const expiryDate = new Date(tokenExpiry);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24;
  };

  const getTokenExpiryProgress = (tokenExpiry: string): number => {
    const expiryDate = new Date(tokenExpiry);
    const now = new Date();
    const totalHours = 24; // Assuming 24 hour token lifetime
    const hoursLeft = Math.max(0, (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return Math.max(0, Math.min(100, (hoursLeft / totalHours) * 100));
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No Amazon connections to monitor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Connection Health Status</h3>
        <Button 
          onClick={() => onHealthCheck()}
          disabled={loading}
          size="sm"
          className="flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Check All Connections
        </Button>
      </div>

      {connections.map(connection => {
        const health = getConnectionHealth(connection);
        const tokenExpiringSoon = isTokenExpiringSoon(health.tokenExpiry);
        const tokenProgress = getTokenExpiryProgress(health.tokenExpiry);

        return (
          <Card key={connection.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {getStatusIcon(health.status)}
                  {health.profileName} ({health.marketplace})
                </CardTitle>
                <Badge variant={getStatusColor(health.status)}>
                  {health.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Expiry Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Token Status</span>
                  <span className={tokenExpiringSoon ? 'text-warning' : 'text-muted-foreground'}>
                    Expires: {format(new Date(health.tokenExpiry), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <Progress 
                  value={tokenProgress} 
                  className={`h-2 ${tokenProgress < 25 ? 'bg-destructive/20' : tokenProgress < 50 ? 'bg-warning/20' : 'bg-success/20'}`}
                />
                {tokenExpiringSoon && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Token expires soon - refresh recommended</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onRefreshToken(connection.id)}
                      >
                        Refresh Token
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Health Issues */}
              {health.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Issues Detected</h4>
                  {health.issues.map((issue, index) => (
                    <Alert key={index}>
                      <AlertDescription className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                            {issue.type}
                          </Badge>
                          <span className="text-sm">{issue.message}</span>
                        </div>
                        {issue.resolution && (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {issue.resolution}
                            </p>
                            {issue.actionUrl && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(issue.actionUrl, '_blank')}
                                className="flex items-center gap-1 text-xs"
                              >
                                Help
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Connection Details */}
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Last Health Check:</span>
                  <br />
                  {health.lastCheck === 'Never' ? 'Never' : format(new Date(health.lastCheck), 'MMM dd, HH:mm')}
                </div>
                <div>
                  <span className="font-medium">API Endpoint:</span>
                  <br />
                  {health.apiEndpoint.replace('https://', '').split('.')[0]}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onHealthCheck(connection.id)}
                  disabled={loading}
                >
                  Check Health
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onRefreshToken(connection.id)}
                  disabled={loading}
                >
                  Refresh Token
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AmazonHealthStatus;