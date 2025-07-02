
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from 'lucide-react';
import { AmazonConnection } from '@/hooks/useAmazonConnections';

interface ConnectionSummaryTableProps {
  connections: AmazonConnection[];
  onSync?: (connectionId: string) => void;
  onDelete?: (connectionId: string) => void;
}

const ConnectionSummaryTable = ({ 
  connections, 
  onSync, 
  onDelete 
}: ConnectionSummaryTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'disconnected':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'error') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Amazon Connections</CardTitle>
          <CardDescription>No Amazon connections found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Connect your Amazon account to see connection details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amazon Connections</CardTitle>
        <CardDescription>
          Overview of your Amazon Ads API connections - {connections.length} connection{connections.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile Name</TableHead>
                <TableHead>Profile ID</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected At</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell className="font-medium">
                    {connection.profileName}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {connection.profile_id}
                  </TableCell>
                  <TableCell>
                    {connection.marketplace_id || 'US'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.status)}
                      <Badge variant={getStatusColor(connection.status)}>
                        {connection.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(connection.connectedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {connection.last_sync_at 
                      ? new Date(connection.last_sync_at).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onSync && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSync(connection.id)}
                          disabled={connection.status !== 'connected'}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(connection.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionSummaryTable;
