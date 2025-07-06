
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle, RefreshCw, Bug } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useToast } from '@/hooks/use-toast';
import ConnectionSummaryTable from '@/components/performance/ConnectionSummaryTable';
import ConnectionRecovery from '@/components/ConnectionRecovery';
import EnhancedAmazonSync from '@/components/EnhancedAmazonSync';

const AmazonAccountSetup = () => {
  const { 
    connections, 
    loading, 
    error, 
    initiateConnection, 
    syncConnection, 
    deleteConnection,
    refreshConnections 
  } = useAmazonConnections();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      console.log('=== Amazon Connect Button Clicked ===');
      console.log('Current environment:', window.location.origin);
      const redirectUri = 'https://ppcpal.online/amazon-callback';
      console.log('Using redirect URI:', redirectUri);
      await initiateConnection(redirectUri);
    } catch (err) {
      console.error('Connect error:', err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to initiate Amazon connection",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (connectionId: string) => {
    console.log('=== Standard Sync Started ===');
    console.log('Connection ID:', connectionId);
    await syncConnection(connectionId);
  };

  const handleForceSync = async (connectionId: string) => {
    console.log('=== Force Sync Started ===');
    console.log('Connection ID:', connectionId);
    await syncConnection(connectionId);
    toast({
      title: "Force Sync Initiated",
      description: "Attempting to sync connection with enhanced parameters.",
    });
  };

  const handleDebugConnection = async (connectionId: string) => {
    console.log('=== Debug Connection Started ===');
    console.log('Connection ID:', connectionId);
    
    try {
      // Get connection details
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        console.error('Connection not found');
        toast({
          title: "Debug Failed",
          description: "Connection not found",
          variant: "destructive",
        });
        return;
      }

      console.log('=== Connection Debug Info ===');
      console.log('ID:', connection.id);
      console.log('Profile ID:', connection.profile_id);
      console.log('Profile Name:', connection.profile_name);
      console.log('Marketplace ID:', connection.marketplace_id);
      console.log('Status:', connection.status);
      console.log('Token Expires:', connection.token_expires_at);
      console.log('Last Sync:', connection.last_sync_at);
      
      // Check token expiry
      const tokenExpiry = new Date(connection.token_expires_at);
      const now = new Date();
      const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      console.log('Token Status:');
      console.log('- Expires:', tokenExpiry.toISOString());
      console.log('- Hours until expiry:', hoursUntilExpiry);
      console.log('- Is expired:', tokenExpiry <= now);
      
      toast({
        title: "Debug Complete",
        description: `Check console for detailed connection info. Token ${hoursUntilExpiry > 0 ? `expires in ${hoursUntilExpiry}h` : `expired ${Math.abs(hoursUntilExpiry)}h ago`}`,
      });
    } catch (err) {
      console.error('Debug error:', err);
      toast({
        title: "Debug Failed",
        description: err instanceof Error ? err.message : "Unknown debug error",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            Amazon Advertising Setup
          </CardTitle>
          <CardDescription>Loading your Amazon connections...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png" 
              alt="Amazon" 
              className="h-5 w-auto"
            />
            Amazon Advertising Setup
          </CardTitle>
          <CardDescription>
            Connect your Amazon Advertising account to sync campaigns and optimize performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Connection Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshConnections}
                  className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {connections.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Amazon Accounts Connected
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect your Amazon Advertising account to start optimizing your campaigns
                </p>
              </div>
              
              <Button onClick={handleConnect} className="mb-4" disabled={loading}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {loading ? 'Connecting...' : 'Connect Amazon Account'}
              </Button>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-medium text-blue-800 mb-2">Before you connect:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Make sure you have an active Amazon Advertising account</li>
                  <li>• Ensure you have campaigns with recent activity</li>
                  <li>• You'll be redirected to Amazon to authorize access</li>
                  <li>• The connection process may take a few moments</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Amazon Account Connected</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDebugConnection(connections[0].id)}
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Debug
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Add Another Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show connection recovery for problematic connections */}
      {connections.map((connection) => (
        <ConnectionRecovery
          key={`recovery-${connection.id}`}
          connectionId={connection.id}
          connectionName={connection.profile_name}
          profileId={connection.profile_id}
          onRecoveryComplete={refreshConnections}
        />
      ))}

      {/* Enhanced Sync for connections that need it */}
      {connections.length > 0 && connections.some(conn => 
        conn.status === 'setup_required' || 
        conn.status === 'warning' || 
        !conn.profile_id ||
        conn.profile_id === 'setup_required_no_profiles_found'
      ) && (
        <EnhancedAmazonSync
          connectionId={connections[0].id}
          connectionName={connections[0].profile_name}
          onSyncComplete={refreshConnections}
        />
      )}

      {connections.length > 0 && (
        <ConnectionSummaryTable 
          connections={connections}
          onSync={handleSync}
          onDelete={deleteConnection}
          onForceSync={handleForceSync}
        />
      )}
    </div>
  );
};

export default AmazonAccountSetup;
