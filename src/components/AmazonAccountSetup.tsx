
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, ExternalLink, RotateCcw } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import AmazonOAuthSetup from "@/components/AmazonOAuthSetup";
import AmazonConnectionDiagnostics from "@/components/AmazonConnectionDiagnostics";
import { formatDistanceToNow } from "date-fns";

const AmazonAccountSetup = () => {
  const { connections, loading, initiateConnection, syncConnection, deleteConnection, refreshConnection } = useAmazonConnections();

  const handleConnect = () => {
    initiateConnection();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'setup_required':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'setup_required':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-600" />
            Amazon Ads Account Setup
          </CardTitle>
          <CardDescription>
            Connect your Amazon Advertising accounts to enable automated optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {connections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No Amazon accounts connected yet</p>
                  <Button onClick={handleConnect} className="bg-orange-600 hover:bg-orange-700">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Amazon Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(connection.status)}
                        <div>
                          <h4 className="font-medium">{connection.profile_name || 'Amazon Profile'}</h4>
                          <p className="text-sm text-gray-500">
                            Profile ID: {connection.profile_id}
                            {typeof connection.campaign_count === 'number' && (
                              <span className="ml-2">• Campaigns: {connection.campaign_count}</span>
                            )}
                            {connection.last_sync_at && (
                              <span className="ml-2">
                                • Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                              </span>
                            )}
                          </p>
                          {connection.setup_required_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Setup required: {connection.setup_required_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(connection.status)}>
                          {connection.status}
                        </Badge>
                        {connection.status === 'expired' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshConnection(connection.id)}
                            disabled={loading}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncConnection(connection.id)}
                          disabled={loading || connection.status !== 'active'}
                          title={connection.status !== 'active' ? 'Connection must be active to sync' : 'Sync Amazon data'}
                        >
                          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConnection(connection.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleConnect} variant="outline" className="w-full">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Another Account
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Show diagnostics if there are connection issues */}
      {connections.some(c => c.status === 'error' || c.status === 'setup_required') && (
        <AmazonConnectionDiagnostics />
      )}
      
      {/* Show OAuth setup guide if there are connection issues or no connections yet */}
      {(connections.length === 0 || connections.some(c => c.status === 'error' || c.status === 'setup_required')) && (
        <AmazonOAuthSetup />
      )}
    </>
  );
};

export default AmazonAccountSetup;
