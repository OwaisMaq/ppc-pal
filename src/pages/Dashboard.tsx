
import PerformanceSummary from "@/components/PerformanceSummary";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

const Dashboard = () => {
  const { connections } = useAmazonConnections();

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

        <div>
          <PerformanceSummary />
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Dashboard;
