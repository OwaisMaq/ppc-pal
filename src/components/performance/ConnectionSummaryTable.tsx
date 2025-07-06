import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Info,
  ExternalLink,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AmazonConnection } from '@/hooks/useAmazonConnections';
import AmazonSetupGuide from '@/components/AmazonSetupGuide';
import EnhancedAmazonSync from '@/components/EnhancedAmazonSync';

interface ConnectionSummaryTableProps {
  connections: AmazonConnection[];
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  onForceSync: (connectionId: string) => void;
}

const ConnectionSummaryTable = ({ 
  connections, 
  onSync, 
  onDelete, 
  onForceSync 
}: ConnectionSummaryTableProps) => {
  const [showSetupGuide, setShowSetupGuide] = useState<string | null>(null);
  const [showEnhancedSync, setShowEnhancedSync] = useState<string | null>(null);

  const getStatusBadge = (connection: AmazonConnection) => {
    switch (connection.status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'setup_required':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Setup Required
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusDescription = (connection: AmazonConnection) => {
    switch (connection.setup_required_reason) {
      case 'no_advertising_profiles':
        return 'No advertising profiles found - Amazon Advertising setup required';
      case 'needs_sync':
        return 'Profile configured - ready for campaign sync';
      case 'token_expired':
        return 'Access token has expired - reconnection required';
      case 'connection_error':
        return 'Technical connection issue detected';
      default:
        if (connection.status === 'active') {
          const campaignCount = connection.campaign_count || 0;
          return campaignCount > 0 
            ? `${campaignCount} campaigns synced successfully`
            : 'Connection active - campaigns not yet synced';
        }
        return 'Status unknown';
    }
  };

  const canSync = (connection: AmazonConnection) => {
    return ['active', 'setup_required', 'warning'].includes(connection.status);
  };

  const canForceSync = (connection: AmazonConnection) => {
    return connection.status !== 'expired';
  };

  const requiresSetup = (connection: AmazonConnection) => {
    return connection.setup_required_reason === 'no_advertising_profiles';
  };

  const needsEnhancedSync = (connection: AmazonConnection) => {
    return connection.status === 'setup_required' || 
           (connection.status === 'active' && (connection.campaign_count || 0) === 0);
  };

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Amazon Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection) => (
              <div key={connection.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{connection.profileName}</h3>
                      {getStatusBadge(connection)}
                      {needsEnhancedSync(connection) && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          <Zap className="h-3 w-3 mr-1" />
                          Enhanced Sync Available
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{getStatusDescription(connection)}</p>
                      {connection.marketplace_id && (
                        <p>Marketplace: {connection.marketplace_id}</p>
                      )}
                      {connection.campaign_count > 0 && (
                        <p className="text-green-600 font-medium">
                          {connection.campaign_count} campaigns detected
                        </p>
                      )}
                      {connection.last_sync_at && (
                        <p>
                          Last synced: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                        </p>
                      )}
                      <p>
                        Connected: {formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true })}
                      </p>
                    </div>

                    {requiresSetup(connection) && (
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <span>Amazon Advertising setup required to sync campaigns</span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowSetupGuide(connection.id)}
                              >
                                Setup Guide
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowEnhancedSync(connection.id)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Enhanced Sync
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {needsEnhancedSync(connection) && !requiresSetup(connection) && (
                      <Alert className="mt-3 border-blue-200 bg-blue-50">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <div className="space-y-2">
                            <span>Enhanced sync can detect profiles and sync campaigns in one process</span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowEnhancedSync(connection.id)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Run Enhanced Sync
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {canSync(connection) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSync(connection.id)}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sync
                      </Button>
                    )}
                    
                    {canForceSync(connection) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onForceSync(connection.id)}
                        className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Zap className="h-4 w-4" />
                        Force Sync
                      </Button>
                    )}
                    
                    {connection.status === 'expired' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = '/settings'}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reconnect
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(connection.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showSetupGuide === connection.id && (
                  <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Amazon Advertising Setup</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowSetupGuide(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <AmazonSetupGuide 
                      onRetryConnection={() => onForceSync(connection.id)}
                      connectionStatus={connection.status}
                      setupReason={connection.setup_required_reason}
                    />
                  </div>
                )}

                {showEnhancedSync === connection.id && (
                  <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Enhanced Sync & Recovery</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowEnhancedSync(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <EnhancedAmazonSync 
                      connectionId={connection.id}
                      connectionName={connection.profileName}
                      onSyncComplete={() => {
                        setShowEnhancedSync(null);
                        // Trigger a refresh of connections if callback is available
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {connections.some(conn => conn.status === 'setup_required' || conn.status === 'warning') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Enhanced Sync Available:</strong> For connections with setup issues:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li><strong>Enhanced Sync:</strong> Advanced profile detection across multiple regions and complete campaign sync</li>
                <li><strong>Force Sync:</strong> Quick retry with basic profile detection</li>
                <li><strong>Setup Guide:</strong> Step-by-step instructions for Amazon Advertising</li>
                <li><strong>Regular Sync:</strong> Standard sync for properly configured connections</li>
              </ul>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://advertising.amazon.com', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Amazon Advertising Help
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ConnectionSummaryTable;
