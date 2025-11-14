import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RefreshLog {
  id: string;
  connection_id: string;
  profile_id: string;
  status: 'success' | 'failed';
  error_message: string | null;
  refreshed_at: string;
}

interface ConnectionStatus {
  profile_id: string;
  profile_name: string | null;
  token_expires_at: string;
  last_refresh: RefreshLog | null;
  hours_until_expiry: number;
}

export const TokenRefreshMonitor = () => {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokenStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadTokenStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTokenStatus = async () => {
    try {
      // Get all connections with their latest refresh log
      const { data: connectionsData, error: connError } = await supabase
        .from('amazon_connections')
        .select('id, profile_id, profile_name, token_expires_at, status')
        .eq('status', 'active')
        .order('token_expires_at', { ascending: true });

      if (connError) throw connError;

      // Get latest refresh logs
      const { data: logsData, error: logsError } = await supabase
        .from('token_refresh_log')
        .select('*')
        .order('refreshed_at', { ascending: false });

      if (logsError) throw logsError;

      // Combine data
      const statusData: ConnectionStatus[] = (connectionsData || []).map(conn => {
        const latestLog = (logsData || []).find(log => log.connection_id === conn.id);
        const expiryDate = new Date(conn.token_expires_at);
        const hoursUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);

        return {
          profile_id: conn.profile_id,
          profile_name: conn.profile_name,
          token_expires_at: conn.token_expires_at,
          last_refresh: latestLog ? {
            ...latestLog,
            status: latestLog.status as 'success' | 'failed'
          } : null,
          hours_until_expiry: Math.round(hoursUntilExpiry * 10) / 10,
        };
      });

      setConnections(statusData);
    } catch (error) {
      console.error('Error loading token status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Token Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const criticalConnections = connections.filter(c => c.hours_until_expiry < 24);
  const failedRefreshes = connections.filter(c => c.last_refresh?.status === 'failed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Token Refresh Status
        </CardTitle>
        <CardDescription>
          Automated token refresh runs every 30 minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={criticalConnections.length > 0 ? "destructive" : "secondary"}>
              {criticalConnections.length} expiring soon
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={failedRefreshes.length > 0 ? "destructive" : "secondary"}>
              {failedRefreshes.length} failed refreshes
            </Badge>
          </div>
        </div>

        {/* Connection List */}
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.profile_id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {conn.profile_name || conn.profile_id}
                </div>
                <div className="text-sm text-muted-foreground">
                  {conn.hours_until_expiry < 0 ? (
                    <span className="text-destructive">
                      Expired {formatDistanceToNow(new Date(conn.token_expires_at))} ago
                    </span>
                  ) : conn.hours_until_expiry < 24 ? (
                    <span className="text-destructive">
                      Expires in {conn.hours_until_expiry}h
                    </span>
                  ) : (
                    <span>
                      Expires in {Math.round(conn.hours_until_expiry / 24)}d
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {conn.last_refresh ? (
                  <>
                    {conn.last_refresh.status === 'success' ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        Refreshed {formatDistanceToNow(new Date(conn.last_refresh.refreshed_at))} ago
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary">No refresh yet</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {connections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active connections found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
