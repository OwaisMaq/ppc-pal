
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { amazonConnectionService } from "@/services/amazonConnectionService";

const AmazonAccountSetup = () => {
  const { connections, loading, initiateConnection, syncConnection, deleteConnection, refreshConnections } = useAmazonConnections();
  const [retryingConnections, setRetryingConnections] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/auth/amazon/callback`;
    console.log('Initiating Amazon connection with redirect URI:', redirectUri);
    initiateConnection(redirectUri);
  };

  const handleRetryProfileFetch = async (connectionId: string) => {
    setRetryingConnections(prev => new Set(prev).add(connectionId));
    
    try {
      console.log('Retrying profile fetch for connection:', connectionId);
      const result = await amazonConnectionService.retryProfileFetch(connectionId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        await refreshConnections();
      } else {
        toast({
          title: "Still No Profiles Found",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error retrying profile fetch:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry profile fetch. Please try reconnecting your account.",
        variant: "destructive",
      });
    } finally {
      setRetryingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string, profileId?: string) => {
    // Check for setup required profiles
    if (profileId?.includes('setup_required') || profileId?.includes('needs_setup')) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string, profileId?: string) => {
    // Check for setup required profiles
    if (profileId?.includes('setup_required') || profileId?.includes('needs_setup')) {
      return 'bg-orange-100 text-orange-800';
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return 'bg-orange-100 text-orange-800';
    }
    
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, profileId?: string) => {
    // Check for setup required profiles
    if (profileId?.includes('setup_required') || profileId?.includes('needs_setup')) {
      return 'setup required';
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return 'needs reconnection';
    }
    
    return status;
  };

  const needsAttention = (connection: any) => {
    return connection.profile_id?.includes('setup_required') || 
           connection.profile_id?.includes('needs_setup') ||
           connection.profile_id?.startsWith('profile_') || 
           connection.profile_id === 'unknown' ||
           connection.status === 'error';
  };

  const getConnectionMessage = (connection: any) => {
    if (connection.profile_id?.includes('setup_required')) {
      return "No advertising profiles found. Set up Amazon Advertising at advertising.amazon.com, then retry.";
    }
    if (connection.profile_id?.includes('needs_setup')) {
      return "Amazon Advertising account setup is required.";
    }
    if (connection.profile_id?.startsWith('profile_') || connection.profile_id === 'unknown') {
      return "Invalid profile ID detected. Please reconnect your account.";
    }
    if (connection.status === 'error') {
      return "Connection error detected. Sync failed - may need reconnection.";
    }
    return null;
  };

  const canRetryProfileFetch = (connection: any) => {
    return connection.profile_id?.includes('setup_required') || 
           connection.profile_id?.includes('needs_setup');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-blue-600" />
          Amazon Ads Account Setup
        </CardTitle>
        <CardDescription>
          Connect your Amazon Advertising accounts to enable automated optimization. 
          Your API credentials are configured and ready to use.
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
                <p className="text-sm text-gray-400 mb-6">
                  Click below to connect your first Amazon Advertising account
                </p>
                <Button onClick={handleConnect} className="bg-orange-600 hover:bg-orange-700">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Amazon Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => {
                  const needsSetup = needsAttention(connection);
                  const message = getConnectionMessage(connection);
                  const canRetry = canRetryProfileFetch(connection);
                  const isRetrying = retryingConnections.has(connection.id);
                  
                  return (
                    <div key={connection.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(connection.status, connection.profile_id)}
                          <div>
                            <h4 className="font-medium">{connection.profile_name || 'Amazon Profile'}</h4>
                            <p className="text-sm text-gray-500">
                              Profile ID: {connection.profile_id} • Marketplace: {connection.marketplace_id || 'US'}
                              {connection.last_sync_at && !needsSetup && (
                                <span className="ml-2">
                                  • Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                                </span>
                              )}
                            </p>
                            {message && (
                              <p className="text-sm text-orange-600 mt-1 font-medium">
                                {message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(connection.status, connection.profile_id)}>
                            {getStatusText(connection.status, connection.profile_id)}
                          </Badge>
                          
                          {canRetry && (
                            <Button
                              onClick={() => handleRetryProfileFetch(connection.id)}
                              size="sm"
                              variant="outline"
                              disabled={isRetrying}
                              title="Retry fetching advertising profiles"
                            >
                              {isRetrying ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4 mr-1" />
                              )}
                              Retry
                            </Button>
                          )}
                          
                          {needsSetup && !canRetry ? (
                            <Button
                              onClick={handleConnect}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700"
                              title="Reconnect account"
                            >
                              <LinkIcon className="h-4 w-4 mr-1" />
                              Reconnect
                            </Button>
                          ) : !needsSetup && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncConnection(connection.id)}
                              disabled={connection.status !== 'active'}
                              title="Sync campaign data"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnection(connection.id)}
                            title="Remove connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
  );
};

export default AmazonAccountSetup;
