
import DashboardShell from "@/components/DashboardShell";

import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonGuide from "@/components/AmazonGuide";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export interface AdvertisingData {
  portfolios: any[];
  campaigns: any[];
  adGroups: any[];
  keywords: any[];
}

const Index = () => {
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            File Upload & Optimization
          </h1>
          <p className="text-gray-600">
            Upload your Amazon advertising data files for analysis
          </p>
        </div>

        {/* Info cards at the top - smaller and circular */}
        <div className="mb-6">
          <InfoCards />
        </div>

        {/* Second row - original first row moved down */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Upload Amazon Data */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload Amazon Data
              </CardTitle>
              <CardDescription className="text-sm">
                Upload your Excel workbook containing portfolio, campaign, ad group, and keyword data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-600">Upload functionality has been moved to the dashboard. Please use the main dashboard for data management.</p>
            </CardContent>
          </Card>

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
