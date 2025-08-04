import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, XCircle, RotateCw, RefreshCw, Trash2, Plus } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import AmazonOAuthSetup from "@/components/AmazonOAuthSetup";
import { toast } from "sonner";

const AmazonAccountManager = () => {
  const { connections, loading, initiateConnection, syncConnection, refreshConnection, deleteConnection } = useAmazonConnections();

  const handleConnect = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/amazon/callback`;
      await initiateConnection(redirectUri);
    } catch (error) {
      toast.error("Failed to initiate Amazon connection");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'setup_required':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'expired':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending_approval':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'rejected':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'setup_required':
      case 'error':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const needsSetupOrHasErrors = connections.some(
    conn => ['setup_required', 'error', 'expired', 'pending_approval', 'rejected'].includes(conn.status)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Amazon Account Connections
            <Badge variant="outline">{connections.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-500">Loading connections...</p>
          ) : connections.length === 0 ? (
            <div className="text-center space-y-4">
              <p className="text-gray-500">No Amazon accounts connected yet</p>
              <Button onClick={handleConnect} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Connect Amazon Account
              </Button>
            </div>
          ) : (
            <>
              {connections.map((connection) => (
                <div key={connection.id} className={`p-4 rounded-lg border ${getStatusColor(connection.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(connection.status)}
                      <div>
                        <h3 className="font-medium">
                          {connection.profile_name || 'Amazon Profile'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Profile ID: {connection.profile_id}
                        </p>
                        {connection.marketplace_id && (
                          <p className="text-sm text-gray-600">
                            Marketplace: {connection.marketplace_id}
                          </p>
                        )}
                        {connection.last_sync_at && (
                          <p className="text-sm text-gray-600">
                            Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(connection.status)}>
                        {connection.status.replace('_', ' ')}
                      </Badge>
                      {connection.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncConnection(connection.id)}
                          className="flex items-center gap-1"
                        >
                          <RotateCw className="h-4 w-4" />
                          Sync
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshConnection(connection.id)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteConnection(connection.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {connection.setup_required_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <p className="text-red-800 font-medium">Action Required:</p>
                      <p className="text-red-700">{connection.setup_required_reason}</p>
                    </div>
                  )}
                  {connection.status === 'pending_approval' && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="text-blue-800 font-medium">Under Review:</p>
                      <p className="text-blue-700">Your API access request is being reviewed by Amazon. This typically takes 1-3 business days.</p>
                    </div>
                  )}
                  {connection.status === 'rejected' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <p className="text-red-800 font-medium">Access Denied:</p>
                      <p className="text-red-700">Your API access was rejected. Your account may not meet minimum requirements. Contact Amazon Advertising support for details.</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-center pt-4">
                <Button onClick={handleConnect} variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Another Account
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(connections.length === 0 || needsSetupOrHasErrors) && (
        <AmazonOAuthSetup 
          connectionStatus={connections.find(c => c.status === 'pending_approval')?.status}
          showApprovalProgress={connections.some(c => c.status === 'pending_approval')}
          errorType={connections.find(c => c.status === 'error')?.setup_required_reason}
        />
      )}
    </div>
  );
};

export default AmazonAccountManager;