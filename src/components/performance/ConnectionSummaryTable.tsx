
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { AmazonConnection } from '@/hooks/useAmazonConnections';

interface ConnectionSummaryTableProps {
  connections: AmazonConnection[];
  onSync: (connectionId: string) => Promise<void>;
  onDelete: (connectionId: string) => Promise<void>;
}

const ConnectionSummaryTable = ({ connections, onSync, onDelete }: ConnectionSummaryTableProps) => {
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
        return <Badge variant="secondary">Sync Required</Badge>;
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
      if (!connection.profile_id) {
        return 'No advertising profiles found - set up Amazon Advertising first';
      } else if (connection.needs_sync) {
        return 'Campaign data needs to be synced from Amazon';
      }
      return 'Setup required';
    } else if (connection.status === 'error') {
      return 'Connection error - please reconnect';
    }
    return 'Status unknown';
  };

  const getActionButton = (connection: AmazonConnection) => {
    if (connection.status === 'setup_required' && connection.profile_id) {
      return (
        <Button
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
      return (
        <Button
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
    return null;
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
                        Click sync to import
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
                      {getActionButton(connection)}
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
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Campaign Sync Required</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your Amazon account is connected, but campaign data hasn't been synced yet. 
                  Click "Sync Campaigns" to import your campaign data and view performance metrics.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Make sure your Amazon account has active campaigns with recent activity for best results.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionSummaryTable;
