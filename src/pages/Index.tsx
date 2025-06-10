
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProcessingProgress from "@/components/ProcessingProgress";
import UploadSection from "@/components/UploadSection";
import OptimizationSection from "@/components/OptimizationSection";
import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { useOptimization } from "@/hooks/useOptimization";

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
        <HeroSection />
        
        <ProcessingProgress 
          isProcessing={isProcessing}
          progress={progress}
          currentStep={currentStep}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <UploadSection 
                uploadedData={uploadedData}
                onFileUpload={handleFileUpload}
              />

              <OptimizationSection 
                uploadedData={uploadedData}
                optimizedData={optimizedData}
                isProcessing={isProcessing}
                onOptimize={handleOptimize}
                onDownload={handleDownload}
              />
            </div>

            <InfoCards />
          </div>

          <div className="space-y-6">
            <SubscriptionStatus />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
