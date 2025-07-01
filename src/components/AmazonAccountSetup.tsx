
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
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    }
    
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'disconnected':
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
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
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disconnected':
        return 'bg-orange-100 text-orange-800';
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          Amazon Ads Account Setup
        </CardTitle>
        <CardDescription className="text-sm">
          Connect your Amazon Advertising accounts to enable automated optimization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {connections.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">No Amazon accounts connected yet</p>
                <Button onClick={handleConnect} size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Connect Amazon Account
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((connection) => {
                  const needsSetup = needsAttention(connection);
                  const message = getConnectionMessage(connection);
                  const canRetry = canRetryProfileFetch(connection);
                  const isRetrying = retryingConnections.has(connection.id);
                  
                  return (
                    <div key={connection.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(connection.status, connection.profile_id)}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm">{connection.profileName || 'Amazon Profile'}</h4>
                            <p className="text-xs text-gray-500 truncate">
                              Profile ID: {connection.profile_id || 'N/A'} • Marketplace: {connection.marketplace_id || 'US'}
                              {connection.last_sync_at && !needsSetup && (
                                <span className="ml-1">
                                  • Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                                </span>
                              )}
                            </p>
                            {message && (
                              <p className="text-xs text-orange-600 mt-1 font-medium">
                                {message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-xs ${getStatusColor(connection.status, connection.profile_id)}`}>
                            {getStatusText(connection.status, connection.profile_id)}
                          </Badge>
                          
                          {canRetry && (
                            <Button
                              onClick={() => handleRetryProfileFetch(connection.id)}
                              size="sm"
                              variant="outline"
                              disabled={isRetrying}
                              title="Retry fetching advertising profiles"
                              className="h-7 px-2"
                            >
                              {isRetrying ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          
                          {needsSetup && !canRetry ? (
                            <Button
                              onClick={handleConnect}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 h-7 px-2"
                              title="Reconnect account"
                            >
                              <LinkIcon className="h-3 w-3" />
                            </Button>
                          ) : !needsSetup && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncConnection(connection.id)}
                              disabled={connection.status !== 'connected'}
                              title="Sync campaign data"
                              className="h-7 px-2"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnection(connection.id)}
                            title="Remove connection"
                            className="h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button onClick={handleConnect} variant="outline" size="sm" className="w-full">
                  <LinkIcon className="h-3 w-3 mr-1" />
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
