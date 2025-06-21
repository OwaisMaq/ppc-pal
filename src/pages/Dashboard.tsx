
import PerformanceSummary from "@/components/PerformanceSummary";
import OptimizationDashboard from "@/components/OptimizationDashboard";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const { connections } = useAmazonConnections();
  const hasActiveConnections = connections.some(c => c.status === 'active');

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PPC Automation Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and optimize your Amazon Advertising campaigns with AI
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="performance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="performance">Performance Summary</TabsTrigger>
                <TabsTrigger value="optimization">Optimization</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance">
                <PerformanceSummary />
              </TabsContent>
              
              <TabsContent value="optimization">
                {hasActiveConnections ? (
                  <OptimizationDashboard />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-blue-600" />
                        Connect Amazon Account
                      </CardTitle>
                      <CardDescription>
                        Connect your Amazon Advertising account to enable optimization features
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500 mb-6">
                        To access optimization features, you'll need to connect your Amazon Advertising account.
                      </p>
                      <Link to="/settings">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Settings className="h-4 w-4 mr-2" />
                          Go to Settings
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Subscription Status */}
          <div>
            <SubscriptionStatus />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
