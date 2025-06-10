
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Zap, FileSpreadsheet, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
import DataPreview from "@/components/DataPreview";
import OptimizationResults from "@/components/OptimizationResults";
import { optimizeAdvertisingData } from "@/lib/aiOptimizer";
import { exportToExcel } from "@/lib/excelProcessor";

export interface AdvertisingData {
  portfolios: any[];
  campaigns: any[];
  adGroups: any[];
  keywords: any[];
}

const Index = () => {
  const [uploadedData, setUploadedData] = useState<AdvertisingData | null>(null);
  const [optimizedData, setOptimizedData] = useState<AdvertisingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const handleFileUpload = (data: AdvertisingData) => {
    setUploadedData(data);
    setOptimizedData(null);
    toast.success("Amazon advertising data uploaded successfully!");
  };

  const handleOptimize = async () => {
    if (!uploadedData) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      setCurrentStep("Analyzing data structure...");
      setProgress(20);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep("Processing with AI optimization...");
      setProgress(50);
      
      const optimized = await optimizeAdvertisingData(uploadedData);
      
      setCurrentStep("Finalizing optimizations...");
      setProgress(80);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setOptimizedData(optimized);
      setProgress(100);
      setCurrentStep("Optimization complete!");
      
      toast.success("Advertising data optimized successfully!");
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error("Failed to optimize data. Please try again.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setCurrentStep("");
      }, 2000);
    }
  };

  const handleDownload = async () => {
    if (!optimizedData) return;
    
    try {
      await exportToExcel(optimizedData);
      toast.success("Optimized workbook downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download workbook. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 rounded-full p-3 mr-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Amazon Ad Optimizer</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your Amazon advertising data and let AI optimize your campaigns, keywords, and bids for maximum performance
          </p>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">{currentStep}</span>
                  <span className="text-sm text-blue-600">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
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

          {/* Processing & Results Section */}
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

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">1. Upload Data</h3>
              <p className="text-sm text-gray-600">Upload your Amazon advertising Excel workbook</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">2. AI Optimization</h3>
              <p className="text-sm text-gray-600">AI analyzes and optimizes your campaigns and keywords</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Download className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">3. Download Results</h3>
              <p className="text-sm text-gray-600">Get your optimized data in Excel format</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
