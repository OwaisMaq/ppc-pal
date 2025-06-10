
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
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
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

        {/* Bottom row - Data preview and AI optimization */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Data Preview */}
          <div className="space-y-6">
            {uploadedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    Data Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataPreview data={uploadedData} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Optimization */}
          <div className="space-y-6">
            {uploadedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    AI Optimization
                  </CardTitle>
                  <CardDescription>
                    Let AI analyze and optimize your advertising data
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Optimization Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OptimizationResults 
                      originalData={uploadedData!}
                      optimizedData={optimizedData}
                    />
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Download className="h-5 w-5" />
                      Download Optimized Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
