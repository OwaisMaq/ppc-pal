
import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import OptimizationDashboard from "@/components/OptimizationDashboard";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonDataDashboard from "@/components/AmazonDataDashboard";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

const Dashboard = () => {
  const { connections } = useAmazonConnections();
  const hasActiveConnections = connections.some(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PPC Automation Dashboard
          </h1>
          <p className="text-gray-600">
            Connect your Amazon Advertising accounts and let AI optimize your campaigns automatically
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Account Setup */}
          <div className="lg:col-span-2">
            <AmazonAccountSetup />
          </div>

          {/* Subscription Status */}
          <div>
            <SubscriptionStatus />
          </div>

          
          {/* Amazon Data Dashboard - Full Width */}
          {hasActiveConnections && (
            <div className="lg:col-span-3">
              <AmazonDataDashboard />
            </div>
          )}

          {/* Optimization Dashboard - Full Width */}
          {hasActiveConnections && (
            <div className="lg:col-span-3">
              <OptimizationDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
