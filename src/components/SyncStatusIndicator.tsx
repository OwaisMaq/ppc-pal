import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock, RefreshCw, Zap } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { formatDistanceToNow } from "date-fns";

interface SyncStatusIndicatorProps {
  onSyncAll?: () => void;
  loading?: boolean;
}

export const SyncStatusIndicator = ({ onSyncAll, loading }: SyncStatusIndicatorProps) => {
  const { connections } = useAmazonConnections();

  const activeConnections = connections.filter(c => c.status === 'active');
  const expiredConnections = connections.filter(c => c.status === 'expired');
  const errorConnections = connections.filter(c => c.status === 'error');

  const getLastSyncStatus = () => {
    if (activeConnections.length === 0) return 'no_connections';
    
    const neverSynced = activeConnections.filter(c => !c.last_sync_at);
    if (neverSynced.length > 0) return 'never_synced';
    
    const oldestSync = activeConnections
      .map(c => c.last_sync_at ? new Date(c.last_sync_at).getTime() : 0)
      .reduce((min, current) => Math.min(min, current), Date.now());
    
    const hoursSinceOldestSync = (Date.now() - oldestSync) / (1000 * 60 * 60);
    
    if (hoursSinceOldestSync > 24) return 'stale';
    if (hoursSinceOldestSync > 6) return 'old';
    return 'fresh';
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'fresh':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'old':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'stale':
      case 'never_synced':
        return <AlertCircle className="h-4 w-4 text-error" />;
      case 'no_connections':
        return <AlertCircle className="h-4 w-4 text-neutral-400" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getSyncStatusMessage = (status: string) => {
    switch (status) {
      case 'fresh':
        return 'Data is up to date';
      case 'old':
        return 'Data may be outdated (>6 hours)';
      case 'stale':
        return 'Data is stale (>24 hours)';
      case 'never_synced':
        return 'Initial sync required';
      case 'no_connections':
        return 'No connections available';
      default:
        return 'Unknown sync status';
    }
  };

  const syncStatus = getLastSyncStatus();
  const needsAttention = syncStatus === 'never_synced' || syncStatus === 'stale' || errorConnections.length > 0;

  return (
    <Card className={needsAttention ? "border-warning" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSyncStatusIcon(syncStatus)}
            <CardTitle className="text-sm">Sync Status</CardTitle>
          </div>
          <Button
            onClick={onSyncAll}
            disabled={loading || activeConnections.length === 0}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
        <CardDescription className="text-xs">
          {getSyncStatusMessage(syncStatus)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {activeConnections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs py-0">
                  {connection.profile_name || 'Amazon Profile'}
                </Badge>
                <span className="text-neutral-600">
                  {connection.campaign_count || 0} campaigns
                </span>
              </div>
              <div className="text-right">
                {connection.last_sync_at ? (
                  <span className="text-neutral-500">
                    {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-xs py-0">
                    Never synced
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {expiredConnections.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-1 text-warning text-xs mb-1">
                <Clock className="h-3 w-3" />
                {expiredConnections.length} connection(s) expired
              </div>
            </div>
          )}

          {errorConnections.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-1 text-error text-xs mb-1">
                <AlertCircle className="h-3 w-3" />
                {errorConnections.length} connection(s) have errors
              </div>
            </div>
          )}

          {needsAttention && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-1 text-warning text-xs">
                <Zap className="h-3 w-3" />
                Action required - sync your data for accurate reporting
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};