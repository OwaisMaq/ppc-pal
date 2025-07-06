
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, CheckCircle, AlertTriangle, XCircle, Clock, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { AmazonConnection } from '@/hooks/useAmazonConnections';

interface ConnectionSummaryTableProps {
  connections: AmazonConnection[];
  onSync: (connectionId: string) => Promise<void>;
  onDelete: (connectionId: string) => Promise<void>;
  onForceSync?: (connectionId: string) => Promise<void>;
}

const ConnectionSummaryTable = ({ connections, onSync, onDelete, onForceSync }: ConnectionSummaryTableProps) => {
  const getStatusIcon = (connection: AmazonConnection) => {
    switch (connection.status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'setup_required':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (connection: AmazonConnection) => {
    switch (connection.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Connected</Badge>;
      case 'setup_required':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Setup Required</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusDescription = (connection: AmazonConnection) => {
    if (connection.status === 'connected') {
      return `${connection.campaign_count || 0} campaigns synced`;
    } else if (connection.status === 'setup_required') {
      if (connection.setup_required_reason === 'no_advertising_profiles') {
        return 'No advertising profiles found - Set up Amazon Advertising first';
      } else if (connection.setup_required_reason === 'needs_sync') {
        return 'Campaign data needs to be synced from Amazon';
      } else if (connection.setup_required_reason === 'token_expired') {
        return 'Access token expired - please reconnect';
      }
      return 'Setup required';
    } else if (connection.status === 'error') {
      return 'Connection error - please reconnect';
    }
    return 'Status unknown';
  };

  const getActionButtons = (connection: AmazonConnection) => {
    const buttons = [];
    
    if (connection.setup_required_reason === 'token_expired' || connection.status === 'error') {
      // For expired tokens or errors, suggest reconnection
      buttons.push(
        <Button
          key="reconnect"
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/settings'}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Reconnect
        </Button>
      );
    } else if (connection.status === 'setup_required' && connection.setup_required_reason === 'needs_sync') {
      buttons.push(
        <Button
          key="sync"
          variant="outline"
          size="sm"
          onClick={() => onSync(connection.id)}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Sync Campaigns
        </Button>
      );
    } else if (connection.status === 'connected') {
      buttons.push(
        <Button
          key="refresh"
          variant="outline"
          size="sm"
          onClick={() => onSync(connection.id)}
          className="text-gray-600 border-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      );
    }

    // Add Force Sync button for connections that need advertising profile setup
    if (connection.status === 'setup_required' && connection.setup_required_reason === 'no_advertising_profiles' && onForceSync) {
      buttons.push(
        <Button
          key="force-sync"
          variant="outline"
          size="sm"
          onClick={() => onForceSync(connection.id)}
          className="text-orange-600 border-orange-600 hover:bg-orange-50"
        >
          <Zap className="h-4 w-4 mr-1" />
          Force Sync
        </Button>
      );
    }

    return buttons;
  };

  const getSyncStatusInfo = (connection: AmazonConnection) => {
    if (!connection.last_sync_at) {
      return {
        text: 'Never',
        className: 'text-gray-500'
      };
    }
    
    const lastSync = new Date(connection.last_sync_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return {
        text: 'Today',
        className: 'text-green-600'
      };
    } else if (diffDays === 1) {
      return {
        text: 'Yesterday',
        className: 'text-green-600'
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days ago`,
        className: 'text-yellow-600'
      };
    } else {
      return {
        text: `${diffDays} days ago`,
        className: 'text-red-600'
      };
    }
  };

  if (connections.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amazon Account Connections</CardTitle>
        <CardDescription>
          Manage your connected Amazon Advertising accounts and sync campaign data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign Count</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((connection) => {
                const syncInfo = getSyncStatusInfo(connection);
                return (
                  <TableRow key={connection.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(connection)}
                        <div>
                          <div className="font-medium">{connection.profileName}</div>
                          <div className="text-sm text-gray-500">
                            {getStatusDescription(connection)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {connection.marketplace_id || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(connection)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {connection.campaign_count || 0}
                      </div>
                      {connection.campaign_count === 0 && connection.status === 'setup_required' && (
                        <div className="text-xs text-gray-500">
                          {connection.setup_required_reason === 'no_advertising_profiles' 
                            ? 'Setup required' 
                            : 'Click sync to import'
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm font-medium ${syncInfo.className}`}>
                        {syncInfo.text}
                      </div>
                      {connection.last_sync_at && (
                        <div className="text-xs text-gray-500">
                          {new Date(connection.last_sync_at).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionButtons(connection)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(connection.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {connections.some(c => c.status === 'setup_required') && (
          <div className="mt-4 space-y-3">
            {connections.some(c => c.setup_required_reason === 'no_advertising_profiles') && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-800">Amazon Advertising Setup Required</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Your Amazon account is connected, but no advertising profiles were found. 
                      You need to set up Amazon Advertising first.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://advertising.amazon.com', '_blank')}
                        className="text-orange-700 border-orange-300 hover:bg-orange-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Set up Amazon Advertising
                      </Button>
                      <span className="text-xs text-orange-600 self-center">
                        After setup, use "Force Sync" to import your campaigns
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {connections.some(c => c.setup_required_reason === 'needs_sync') && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Campaign Sync Required</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your Amazon account is connected with advertising profiles, but campaign data hasn't been synced yet. 
                      Click "Sync Campaigns" to import your campaign data and view performance metrics.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {connections.some(c => c.setup_required_reason === 'token_expired') && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Authentication Expired</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Your Amazon access token has expired. Please reconnect your Amazon account to continue syncing campaign data.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionSummaryTable;
