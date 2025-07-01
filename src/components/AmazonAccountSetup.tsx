
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, AlertTriangle, RotateCcw, Check } from "lucide-react";
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
    toast({
      title: "Redirecting to Amazon",
      description: "You'll be redirected to Amazon to authorize your account connection.",
    });
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
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string, profileId?: string) => {
    // Check for setup required profiles
    if (profileId?.includes('setup_required') || profileId?.includes('needs_setup')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'disconnected':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string, profileId?: string) => {
    // Check for setup required profiles
    if (profileId?.includes('setup_required') || profileId?.includes('needs_setup')) {
      return 'Setup Required';
    }
    
    // Check for invalid profile IDs (legacy)
    if (profileId?.startsWith('profile_') || profileId === 'unknown') {
      return 'Needs Reconnection';
    }
    
    switch (status) {
      case 'connected':
        return 'Connected Successfully';
      case 'error':
        return 'Connection Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return status;
    }
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
      return "Amazon account connected, but no advertising profiles found. Please set up Amazon Advertising at advertising.amazon.com first.";
    }
    if (connection.profile_id?.includes('needs_setup')) {
      return "Amazon Advertising account setup is required to use PPC optimization features.";
    }
    if (connection.profile_id?.startsWith('profile_') || connection.profile_id === 'unknown') {
      return "Connection has invalid profile data. Please reconnect your Amazon account.";
    }
    if (connection.status === 'error') {
      return "Connection error detected. Campaign sync may fail - reconnection recommended.";
    }
    if (connection.status === 'connected' && !needsAttention(connection)) {
      return "Amazon Ads account successfully connected and ready for optimization.";
    }
    return null;
  };

  const canRetryProfileFetch = (connection: any) => {
    return connection.profile_id?.includes('setup_required') || 
           connection.profile_id?.includes('needs_setup');
  };

  const isFullyConnected = (connection: any) => {
    return connection.status === 'connected' && 
           !connection.profile_id?.includes('setup_required') && 
           !connection.profile_id?.includes('needs_setup') &&
           !connection.profile_id?.startsWith('profile_') && 
           connection.profile_id !== 'unknown';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          Amazon Ads Account Setup
        </CardTitle>
        <CardDescription className="text-sm">
          Connect your Amazon Advertising accounts to enable automated PPC optimization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading connections...</span>
          </div>
        ) : (
          <>
            {connections.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <LinkIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm mb-4 font-medium">No Amazon accounts connected</p>
                <p className="text-gray-500 text-xs mb-4">Connect your Amazon Ads account to start optimizing your campaigns</p>
                <Button onClick={handleConnect} size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <LinkIcon className="h-3 w-3 mr-2" />
                  Connect Amazon Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Connection Success Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {connections.filter(isFullyConnected).length} of {connections.length} accounts fully connected
                    </span>
                  </div>
                  {connections.filter(needsAttention).length > 0 && (
                    <p className="text-xs text-blue-700">
                      {connections.filter(needsAttention).length} account(s) need attention for full functionality
                    </p>
                  )}
                </div>

                {/* Individual Connections */}
                {connections.map((connection) => {
                  const hasIssues = needsAttention(connection);
                  const message = getConnectionMessage(connection);
                  const canRetry = canRetryProfileFetch(connection);
                  const isRetrying = retryingConnections.has(connection.id);
                  const fullyConnected = isFullyConnected(connection);
                  
                  return (
                    <div key={connection.id} className={`border rounded-lg p-4 ${hasIssues ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(connection.status, connection.profile_id)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{connection.profileName || 'Amazon Profile'}</h4>
                              <Badge className={`text-xs border ${getStatusColor(connection.status, connection.profile_id)}`}>
                                {getStatusText(connection.status, connection.profile_id)}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Profile ID: {connection.profile_id || 'N/A'} • Marketplace: {connection.marketplace_id || 'US'}</div>
                              {connection.last_sync_at && fullyConnected && (
                                <div>Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}</div>
                              )}
                            </div>
                            
                            {message && (
                              <div className={`text-xs mt-2 p-2 rounded ${hasIssues ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                <span className="font-medium">{hasIssues ? '⚠️ ' : '✅ '}</span>
                                {message}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {canRetry && (
                            <Button
                              onClick={() => handleRetryProfileFetch(connection.id)}
                              size="sm"
                              variant="outline"
                              disabled={isRetrying}
                              title="Retry fetching advertising profiles"
                              className="h-8 px-2"
                            >
                              {isRetrying ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          
                          {hasIssues && !canRetry ? (
                            <Button
                              onClick={handleConnect}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 h-8 px-2"
                              title="Reconnect account"
                            >
                              <LinkIcon className="h-3 w-3" />
                            </Button>
                          ) : fullyConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncConnection(connection.id)}
                              title="Sync campaign data"
                              className="h-8 px-2"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnection(connection.id)}
                            title="Remove connection"
                            className="h-8 px-2 hover:bg-red-50 hover:border-red-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-2 border-t border-gray-200">
                  <Button onClick={handleConnect} variant="outline" size="sm" className="w-full">
                    <LinkIcon className="h-3 w-3 mr-2" />
                    Connect Another Amazon Account
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AmazonAccountSetup;
