import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, Database } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { toast } from "sonner";

interface SyncControlsProps {
  onDataRefresh?: () => void;
  loading?: boolean;
}

const SyncControls = ({ onDataRefresh, loading = false }: SyncControlsProps) => {
  const { connections, syncConnection, refreshConnections, loading: connectionsLoading } = useAmazonConnections();
  
  const hasActiveConnections = connections.some(c => c.status === 'active');

  const handleSyncData = async () => {
    if (!hasActiveConnections) {
      toast.error("Please connect your Amazon account first");
      return;
    }

    const activeConnection = connections.find(c => c.status === 'active');
    if (activeConnection) {
      try {
        await syncConnection(activeConnection.id);
        if (onDataRefresh) {
          setTimeout(() => {
            onDataRefresh();
          }, 2000); // Give time for sync to complete
        }
      } catch (error) {
        toast.error("Failed to sync campaign data");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Sync Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={onDataRefresh} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={loading || !hasActiveConnections}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          
          <Button 
            onClick={handleSyncData} 
            className="flex items-center gap-2"
            disabled={!hasActiveConnections}
          >
            <Calendar className="h-4 w-4" />
            Sync Amazon Data
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Connection Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Connections:</span>
              <span className="font-medium">{connections.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Connections:</span>
              <span className="font-medium">{connections.filter(c => c.status === 'active').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Has Active Connections:</span>
              <span className={`font-medium ${hasActiveConnections ? 'text-green-600' : 'text-red-600'}`}>
                {hasActiveConnections ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={refreshConnections} 
            size="sm" 
            variant="outline"
            disabled={connectionsLoading}
            className="mt-3 w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${connectionsLoading ? 'animate-spin' : ''}`} />
            Refresh Connections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncControls;