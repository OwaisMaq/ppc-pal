
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
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
      const redirectUri = 'https://ppcpal.online/amazon-callback';
      await initiateConnection(redirectUri);
    } catch (err) {
      console.error('Connect error:', err);
    }
  };

  const handleSync = async (connectionId: string) => {
    await syncConnection(connectionId);
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
          )}
        </CardContent>
      </Card>

      {/* Show connection recovery for problematic connections */}
      {connections.map((connection) => (
        <ConnectionRecovery
          key={`recovery-${connection.id}`}
          connectionId={connection.id}
          connectionName={connection.profileName}
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
          connectionName={connections[0].profileName}
          onSyncComplete={refreshConnections}
        />
      )}

      {connections.length > 0 && (
        <ConnectionSummaryTable 
          connections={connections}
          onSync={handleSync}
          onDelete={deleteConnection}
        />
      )}
    </div>
  );
};

export default AmazonAccountSetup;
