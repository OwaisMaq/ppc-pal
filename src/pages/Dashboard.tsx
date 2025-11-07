import DashboardShell from "@/components/DashboardShell";
import ConsolidatedDataView from "@/components/ConsolidatedDataView";
import { ASINFilter } from "@/components/ASINFilter";
import { AnomaliesPanel } from "@/components/AnomaliesPanel";
import { BudgetCopilotPanel } from "@/components/BudgetCopilotPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useState } from "react";
const Dashboard = () => {
  const { connections } = useAmazonConnections();
  
  // Check if there are ANY connections (even expired ones)
  const hasConnections = connections.length > 0;
  
  // Check if tokens are healthy (not expired)
  const hasHealthyTokens = connections.some(c => {
    const status = typeof c?.status === 'string' ? c.status.toLowerCase().trim() : String(c?.status ?? '');
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return tokenOk && (status === 'active' || status === 'setup_required' || status === 'pending');
  });
  
  // Check if any tokens are expired
  const hasExpiredTokens = connections.some(c => {
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return !tokenOk;
  });
  
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PPC Automation Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor and manage your Amazon Advertising campaigns
            </p>
          </div>
          
          {/* ASIN Filter */}
          {hasConnections && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Filter by ASIN:</span>
                <ASINFilter 
                  selectedASIN={selectedASIN}
                  onASINChange={setSelectedASIN}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!hasConnections && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  No Amazon connections found. Please connect your account in Settings.
                </p>
                <div className="mt-3">
                  <Button asChild>
                    <Link to="/settings">Go to Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {hasConnections && hasExpiredTokens && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  Your Amazon connection has expired. You can still view historical data, but you'll need to refresh your connection to sync new data.
                </p>
                <div className="mt-3">
                  <Button asChild variant="outline">
                    <Link to="/settings">Refresh Connection</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {hasConnections && (
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
                <TabsTrigger value="budget">Budget Copilot</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance" className="mt-6">
                <ConsolidatedDataView selectedASIN={selectedASIN} />
              </TabsContent>
              
              <TabsContent value="anomalies" className="mt-6">
                <AnomaliesPanel />
              </TabsContent>
              
              <TabsContent value="budget" className="mt-6">
                <BudgetCopilotPanel />
              </TabsContent>
              
              <TabsContent value="overview" className="mt-6">
                <ConsolidatedDataView selectedASIN={selectedASIN} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Dashboard;