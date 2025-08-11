import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import OptimizationDashboard from "@/components/OptimizationDashboard";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonDataDashboard from "@/components/AmazonDataDashboard";
import ConsolidatedDataView from "@/components/ConsolidatedDataView";
import { PerformanceMetricCards } from "@/components/PerformanceMetricCards";
import { CampaignDataTable } from "@/components/CampaignDataTable";
import { WeeklyPerformanceChart } from "@/components/WeeklyPerformanceChart";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const Dashboard = () => {
  const { connections, syncConnection, refreshConnections, loading: connectionsLoading } = useAmazonConnections();
  const { metrics, campaigns, loading, error, refetch } = useCampaignMetrics();
  
  const hasActiveConnections = connections.some(c => c.status === 'active');
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncData = async () => {
    if (!hasActiveConnections) {
      toast.error("Please connect your Amazon account first");
      return;
    }

    const activeConnection = connections.find(c => c.status === 'active');
    if (!activeConnection) return;

    setIsSyncing(true);
    const baseline = activeConnection.last_sync_at || null;

    try {
      await syncConnection(activeConnection.id);

      const maxAttempts = 12; // ~2 minutes total
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 10000));
        const { data, error } = await supabase
          .from('amazon_connections')
          .select('last_sync_at')
          .eq('id', activeConnection.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to poll sync status', error);
          break;
        }

        if (data?.last_sync_at && data.last_sync_at !== baseline) {
          toast.success("Sync completed. Updating dashboard...");
          await refetch();
          return;
        }
      }

      toast.info("Sync is still processing. Data will update shortly.");
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync campaign data");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PPC Automation Dashboard
            </h1>
            <p className="text-gray-600">
              Connect your Amazon Advertising accounts and let AI optimize your campaigns automatically
            </p>
          </div>
          
          {hasActiveConnections && (
            <div className="flex gap-3">
              <Button 
                onClick={refetch} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={loading || isSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                onClick={handleSyncData} 
                className="flex items-center gap-2"
                disabled={isSyncing}
              >
                <Calendar className={`h-4 w-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                {isSyncing ? 'Syncing…' : 'Sync Amazon Data'}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Debug Section - Temporary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-sm">
                <strong>Debug Info:</strong>
                <br />
                Connections count: {connections.length}
                <br />
                Active connections: {connections.filter(c => c.status === 'active').length}
                <br />
                Connection statuses: {connections.map(c => `${c.profile_name || 'Unknown'}: ${c.status}`).join(', ')}
                <br />
                Has active connections: {hasActiveConnections ? 'Yes' : 'No'}
                <br />
                <Button 
                  onClick={refreshConnections} 
                  size="sm" 
                  variant="outline"
                  disabled={connectionsLoading}
                  className="mt-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${connectionsLoading ? 'animate-spin' : ''}`} />
                  Refresh Connections
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Account Setup Section */}
          {!hasActiveConnections && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AmazonAccountSetup />
              </div>
            </div>
          )}

          {/* Performance Overview Section */}
          {hasActiveConnections && (
            <>
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-800">Error loading campaign data: {error}</p>
                  </CardContent>
                </Card>
              )}

              {/* KPI Cards */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Performance Overview</h2>
                </div>
                <PerformanceMetricCards metrics={metrics} loading={loading} />
              </div>

              {/* Charts and Tables */}
              <div className="grid lg:grid-cols-2 gap-6">
                <WeeklyPerformanceChart campaigns={campaigns} loading={loading} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Campaigns</span>
                        <span className="font-semibold">
                          {campaigns.filter(c => c.status === 'enabled').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paused Campaigns</span>
                        <span className="font-semibold">
                          {campaigns.filter(c => c.status === 'paused').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best ACOS</span>
                        <span className="font-semibold text-green-600">
                          {campaigns.length > 0 
                            ? `${Math.min(...campaigns.map(c => c.acos || 100)).toFixed(2)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best ROAS</span>
                        <span className="font-semibold text-blue-600">
                          {campaigns.length > 0 
                            ? `${Math.max(...campaigns.map(c => c.roas || 0)).toFixed(2)}x`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Data Table */}
              <CampaignDataTable campaigns={campaigns} loading={loading} />

              {/* Consolidated Data View - Full Width */}
              <div className="lg:col-span-3">
                <ConsolidatedDataView />
              </div>

              {/* Amazon Data Dashboard - Full Width */}
              <div className="lg:col-span-3">
                <AmazonDataDashboard />
              </div>

              {/* Optimization Dashboard - Full Width */}
              <div className="lg:col-span-3">
                <OptimizationDashboard />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;