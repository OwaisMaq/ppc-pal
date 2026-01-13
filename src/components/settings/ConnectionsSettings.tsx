import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Link2, Plus, Users, AlertTriangle, Crown } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useProfileLimits } from '@/hooks/useProfileLimits';
import { getMarketplaceFlag } from '@/context/GlobalFiltersContext';
import AmazonAccountSetup from '@/components/AmazonAccountSetup';
import AmazonPreConnectChecklist from '@/components/AmazonPreConnectChecklist';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ConnectionsSettings = () => {
  const { connections, refreshConnections, loading, initiateConnection } = useAmazonConnections();
  const { currentCount, maxAllowed, canAdd, loading: limitsLoading } = useProfileLimits();
  const [showSetup, setShowSetup] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'expired': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAddClick = () => {
    if (!canAdd) {
      // Navigate to billing settings
      navigate('/settings?tab=billing');
      return;
    }
    // Show checklist first for new connections
    if (connections.length === 0) {
      setShowChecklist(true);
    } else {
      setShowSetup(!showSetup);
    }
  };

  const handleChecklistProceed = () => {
    setShowChecklist(false);
    initiateConnection();
  };

  const handleChecklistCancel = () => {
    setShowChecklist(false);
  };

  return (
    <div className="space-y-4">
      {/* Pre-connect checklist modal */}
      {showChecklist && (
        <AmazonPreConnectChecklist 
          onProceed={handleChecklistProceed}
          onCancel={handleChecklistCancel}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" />
              Amazon Connections
            </CardTitle>
            {!limitsLoading && (
              <Badge variant="outline" className="text-xs font-normal">
                {currentCount} of {maxAllowed} profile{maxAllowed !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshConnections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              size="sm" 
              onClick={handleAddClick}
              variant={canAdd ? "default" : "outline"}
            >
              {canAdd ? (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canAdd && currentCount >= maxAllowed && (
            <Alert variant="default" className="border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                You've reached your profile limit ({maxAllowed}). Upgrade to Pro to connect up to 100 profiles.
              </AlertDescription>
            </Alert>
          )}

          {connections.length === 0 && !showSetup && !showChecklist ? (
            <p className="text-muted-foreground text-sm py-2">No Amazon accounts connected yet.</p>
          ) : (
            connections.map(conn => {
              console.log('Connection marketplace_id:', conn.marketplace_id, 'flag:', getMarketplaceFlag(conn.marketplace_id));
              return (
                <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getMarketplaceFlag(conn.marketplace_id)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{conn.profile_name || 'Unnamed Profile'}</p>
                        {conn.is_managed && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            <Users className="h-3 w-3 mr-1" />
                            Managed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conn.profile_id}
                        {conn.last_sync_at && ` • ${new Date(conn.last_sync_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(conn.status)} variant="secondary">
                    {conn.status}
                  </Badge>
                </div>
              );
            })
          )}

          {showSetup && canAdd && !showChecklist && (
            <div className="pt-2 border-t">
              <AmazonAccountSetup />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
