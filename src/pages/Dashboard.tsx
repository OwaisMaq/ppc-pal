
import PerformanceSummary from "@/components/PerformanceSummary";
import OptimizationDashboard from "@/components/OptimizationDashboard";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { BarChart3, Zap } from "lucide-react";

const Dashboard = () => {
  const { connections } = useAmazonConnections();

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-3">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Welcome back! Here's your performance overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <PerformanceSummary />
          </div>
          <div>
            <OptimizationDashboard />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
