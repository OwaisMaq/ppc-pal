import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, XCircle, CheckCircle, Clock } from "lucide-react";
import { AmazonConnection } from "@/lib/amazon/types";

interface ConnectionStatusAlertProps {
  connection: AmazonConnection;
  onRefresh?: () => Promise<void>;
  onReconnect?: () => Promise<void>;
  loading?: boolean;
}

export const ConnectionStatusAlert = ({ 
  connection, 
  onRefresh, 
  onReconnect, 
  loading = false 
}: ConnectionStatusAlertProps) => {
  const getStatusInfo = () => {
    const status = connection.status?.toLowerCase() || 'unknown';
    const now = Date.now();
    const expiresAt = new Date(connection.token_expires_at).getTime();
    const isExpired = now >= expiresAt;
    const expiresWithin5Min = (expiresAt - now) < (5 * 60 * 1000);

    switch (status) {
      case 'active':
        if (isExpired) {
          return {
            variant: 'destructive' as const,
            icon: XCircle,
            title: 'Connection Expired',
            description: 'Your Amazon token has expired. Please refresh or reconnect your account.',
            actions: ['refresh', 'reconnect']
          };
        }
        if (expiresWithin5Min) {
          return {
            variant: 'destructive' as const,
            icon: AlertTriangle,
            title: 'Token Refresh Issue',
            description: 'Your token is expiring soon and may not have been automatically refreshed. Try refreshing manually.',
            actions: ['refresh']
          };
        }
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          title: 'Connection Active',
          description: 'Your Amazon connection is working properly.',
          actions: []
        };

      case 'expired':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          title: 'Connection Expired',
          description: connection.setup_required_reason || 'Your Amazon connection has expired. Please refresh or reconnect your account.',
          actions: ['refresh', 'reconnect']
        };

      case 'setup_required':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          title: 'Setup Required',
          description: connection.setup_required_reason || 'Your Amazon connection needs to be set up again.',
          actions: ['reconnect']
        };

      case 'pending':
        return {
          variant: 'default' as const,
          icon: Clock,
          title: 'Connection Pending',
          description: 'Your Amazon connection is being set up.',
          actions: []
        };

      default:
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          title: 'Unknown Status',
          description: 'Your Amazon connection status is unknown. Please check your connection.',
          actions: ['refresh', 'reconnect']
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  // Don't show alert for healthy active connections
  if (statusInfo.variant === 'default' && statusInfo.actions.length === 0) {
    return null;
  }

  return (
    <Alert variant={statusInfo.variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{statusInfo.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{statusInfo.description}</p>
          {statusInfo.actions.length > 0 && (
            <div className="flex gap-2">
              {statusInfo.actions.includes('refresh') && onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-8"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh Token
                </Button>
              )}
              {statusInfo.actions.includes('reconnect') && onReconnect && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onReconnect}
                  disabled={loading}
                  className="h-8"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Reconnect Account
                </Button>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};