
import { Bot } from "lucide-react";
import HolidayReminder from "@/components/HolidayReminder";
import ComingSoon from "@/components/ComingSoon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Download, TrendingUp, FileSpreadsheet, LinkIcon, Settings } from "lucide-react";
import DataPreview from "@/components/DataPreview";
import OptimizationResults from "@/components/OptimizationResults";
import { AdvertisingData } from "@/pages/Index";

interface HeroSectionProps {
  uploadedData: AdvertisingData | null;
  optimizedData: AdvertisingData | null;
  isProcessing: boolean;
  onOptimize: () => void;
  onDownload: () => void;
}

const HeroSection = ({ uploadedData, optimizedData, isProcessing, onOptimize, onDownload }: HeroSectionProps) => {
  return (
    <div className="text-center mb-12">
      <HolidayReminder />
      
      <div className="flex items-center justify-center mb-8">
        <div className="bg-blue-600 rounded-full p-3 mr-4">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">PPC Pal</h1>
      </div>

      {/* Coming Soon Features Section */}
      <div className="mb-8 p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
        <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Exciting Features Coming Soon</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Amazon Account Sync</span>
            <ComingSoon />
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Automated PPC Management</span>
            <ComingSoon />
          </div>
        </div>
      </div>

      {/* Second row from the grid - now in hero section */}
      <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                  onClick={onOptimize} 
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
                    onClick={onDownload}
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
  );
};

export default HeroSection;
