
import DashboardShell from "@/components/DashboardShell";
import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonGuide from "@/components/AmazonGuide";
import { TopOffenders } from "@/components/TopOffenders";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const Index = () => {
  // Mock data for Top Offenders - in a real app this would come from your analytics
  const mockOffenders = [
    {
      id: "1",
      name: "Brand Defense Campaign",
      type: "campaign" as const,
      spend: 2500,
      acos: 45.2,
      waste: 750,
      severity: "high" as const
    },
    {
      id: "2", 
      name: "expensive keyword phrase",
      type: "keyword" as const,
      spend: 1200,
      acos: 38.5,
      waste: 420,
      severity: "medium" as const
    }
  ];

  const breadcrumbItems = [
    { label: "Dashboard", current: true }
  ];

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4 space-y-8">
        {/* Breadcrumbs for context */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Amazon PPC Dashboard
          </h1>
          <p className="text-muted-foreground">
            Analyze your Amazon advertising performance and optimize campaigns
          </p>
        </div>

        {/* Quick Actions Cards */}
        <InfoCards />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Amazon Data & Setup */}
          <div className="space-y-6">
            <AmazonGuide />
            <SubscriptionStatus />
          </div>

          {/* Right Column - Top Offenders (Pareto Principle) */}
          <div className="space-y-6">
            <TopOffenders 
              items={mockOffenders}
              className="h-fit"
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Index;
