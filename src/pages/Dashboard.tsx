
import PerformanceSummary from "@/components/PerformanceSummary";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAutoSync } from "@/hooks/useAutoSync";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { BarChart3, RefreshCw } from "lucide-react";

const Dashboard = () => {
  const { connections } = useAmazonConnections();
  const { isSyncing } = useAutoSync(connections);

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-3">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              {isSyncing && (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {isSyncing ? 'Syncing your Amazon data...' : 'Welcome back! Here\'s your performance overview'}
            </p>
          </div>
        </div>

        <div>
          <PerformanceSummary />
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
