import DashboardShell from "@/components/DashboardShell";
import ConsolidatedDataView from "@/components/ConsolidatedDataView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
const Dashboard = () => {
  const { connections } = useAmazonConnections();
  const hasActiveConnections = connections.some(c => c.status === 'active');
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
        </div>

        <div className="space-y-6">
          {!hasActiveConnections && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  No active Amazon connections. Please connect your account in Settings.
                </p>
                <div className="mt-3">
                  <Button asChild>
                    <Link to="/settings">Go to Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {hasActiveConnections && (
            <div className="lg:col-span-3">
              <ConsolidatedDataView />
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Dashboard;