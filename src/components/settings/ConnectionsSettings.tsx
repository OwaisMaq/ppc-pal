import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Link2, ChevronDown, Tag } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import AmazonAccountSetup from '@/components/AmazonAccountSetup';
import AmsSetup from '@/components/AmsSetup';
import { ASINLabelManager } from '@/components/ASINLabelManager';
import { useState } from 'react';

export const ConnectionsSettings = () => {
  const { connections, refreshConnections, loading } = useAmazonConnections();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'expired': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" />
            Amazon Connections
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshConnections} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground text-sm">No Amazon accounts connected yet.</p>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{conn.profile_name || 'Unnamed Profile'}</p>
                    <p className="text-xs text-muted-foreground">
                      Profile ID: {conn.profile_id}
                      {conn.last_sync_at && (
                        <> • Last sync: {new Date(conn.last_sync_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Badge className={getStatusColor(conn.status)}>
                    {conn.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Manage Connections */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span>Add or Manage Connections</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <AmazonAccountSetup />
          <AmsSetup />
        </CollapsibleContent>
      </Collapsible>


      {/* ASIN Labels */}
      <Collapsible open={showLabels} onOpenChange={setShowLabels}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              ASIN Labels
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showLabels ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <ASINLabelManager />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
