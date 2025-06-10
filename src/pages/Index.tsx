
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
      <div className="container mx-auto py-6 px-4">
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
              <FileUpload onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          {/* Amazon Data Download Guide */}
          <AmazonGuide />

          {/* Free Plan Section */}
          <SubscriptionStatus />
        </div>

        {/* Bottom row - Data preview and AI optimization */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Data Preview */}
          <div className="space-y-6">
            {uploadedData && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    Data Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataPreview data={uploadedData} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Optimization */}
          <div className="space-y-6">
            {uploadedData && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    AI Optimization
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Let AI analyze and optimize your advertising data
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={handleOptimize} 
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Optimize Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Download Results */}
          <div className="space-y-6">
            {optimizedData && (
              <>
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Optimization Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <OptimizationResults 
                      originalData={uploadedData!}
                      optimizedData={optimizedData}
                    />
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-green-700 text-lg">
                      <Download className="h-5 w-5" />
                      Download Optimized Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      onClick={handleDownload}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Excel Workbook
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
