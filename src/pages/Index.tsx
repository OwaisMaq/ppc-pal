
import DashboardShell from "@/components/DashboardShell";

import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonGuide from "@/components/AmazonGuide";


const Index = () => {
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Amazon PPC Dashboard
          </h1>
          <p className="text-gray-600">
            Analyze your Amazon advertising performance and optimize campaigns
          </p>
        </div>

        {/* Info cards at the top - smaller and circular */}
        <div className="mb-6">
          <InfoCards />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Amazon Data Download Guide */}
          <AmazonGuide />

          {/* Free Plan Section */}
          <SubscriptionStatus />
        </div>
      </div>
    </DashboardShell>
  );
};

export default Index;
