import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Link2, Plus } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import AmazonAccountSetup from '@/components/AmazonAccountSetup';
import { useState } from 'react';

export const ConnectionsSettings = () => {
  const { connections, refreshConnections, loading } = useAmazonConnections();
  const [showSetup, setShowSetup] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'expired': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" />
            Amazon Connections
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshConnections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowSetup(!showSetup)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.length === 0 && !showSetup ? (
            <p className="text-muted-foreground text-sm py-2">No Amazon accounts connected yet.</p>
          ) : (
            connections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{conn.profile_name || 'Unnamed Profile'}</p>
                  <p className="text-xs text-muted-foreground">
                    {conn.profile_id}
                    {conn.last_sync_at && ` • ${new Date(conn.last_sync_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Badge className={getStatusColor(conn.status)} variant="secondary">
                  {conn.status}
                </Badge>
              </div>
            ))
          )}

          {showSetup && (
            <div className="pt-2 border-t">
              <AmazonAccountSetup />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
