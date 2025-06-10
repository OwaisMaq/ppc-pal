
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProcessingProgress from "@/components/ProcessingProgress";
import UploadSection from "@/components/UploadSection";
import OptimizationSection from "@/components/OptimizationSection";
import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonGuide from "@/components/AmazonGuide";
import { useOptimization } from "@/hooks/useOptimization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Zap, Download, FileSpreadsheet, TrendingUp } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import DataPreview from "@/components/DataPreview";
import OptimizationResults from "@/components/OptimizationResults";

export interface AdvertisingData {
  portfolios: any[];
  campaigns: any[];
  adGroups: any[];
  keywords: any[];
}

const Index = () => {
  const {
    uploadedData,
    optimizedData,
    isProcessing,
    progress,
    currentStep,
    handleFileUpload,
    handleOptimize,
    handleDownload
  } = useOptimization();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <HeroSection 
          uploadedData={uploadedData}
          optimizedData={optimizedData}
          isProcessing={isProcessing}
          onOptimize={handleOptimize}
          onDownload={handleDownload}
        />
        
        <ProcessingProgress 
          isProcessing={isProcessing}
          progress={progress}
          currentStep={currentStep}
        />

        {/* Info cards at the top - moved from bottom */}
        <div className="mb-8">
          <InfoCards />
        </div>

        {/* Second row - original first row moved down */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Amazon Data */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload Amazon Data
              </CardTitle>
              <CardDescription>
                Upload your Excel workbook containing portfolio, campaign, ad group, and keyword data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          {/* Amazon Data Download Guide */}
          <AmazonGuide />

          {/* Free Plan Section */}
          <SubscriptionStatus />
        </div>
      </div>
    </div>
  );
};

export default Index;
