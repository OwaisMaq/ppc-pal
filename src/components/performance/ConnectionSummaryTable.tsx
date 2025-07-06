
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, CheckCircle, AlertTriangle, XCircle, Clock, Zap, ExternalLink } from 'lucide-react';
import { AmazonConnection } from '@/hooks/useAmazonConnections';

interface ConnectionSummaryTableProps {
  connections: AmazonConnection[];
  onSync: (connectionId: string) => Promise<void>;
  onDelete: (connectionId: string) => Promise<void>;
  onForceSync?: (connectionId: string) => Promise<void>;
}

const ConnectionSummaryTable = ({ connections, onSync, onDelete, onForceSync }: ConnectionSummaryTableProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
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
        return <Badge variant="default">Connected</Badge>;
      case 'setup_required':
        return <Badge variant="secondary">Setup Required</Badge>;
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
      }
      return 'Setup required';
    } else if (connection.status === 'error') {
      return 'Connection error - please reconnect';
    }
    return 'Status unknown';
  };

  const getActionButtons = (connection: AmazonConnection) => {
    const buttons = [];
    
    if (connection.status === 'setup_required' && connection.setup_required_reason === 'needs_sync') {
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
              {connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.status)}
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
                    <div className="text-sm">
                      {connection.last_sync_at
                        ? new Date(connection.last_sync_at).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
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
              ))}
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
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Campaign Sync Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your Amazon account is connected with advertising profiles, but campaign data hasn't been synced yet. 
                      Click "Sync Campaigns" to import your campaign data and view performance metrics.
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
