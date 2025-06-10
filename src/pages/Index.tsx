
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProcessingProgress from "@/components/ProcessingProgress";
import UploadSection from "@/components/UploadSection";
import OptimizationSection from "@/components/OptimizationSection";
import InfoCards from "@/components/InfoCards";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonGuide from "@/components/AmazonGuide";
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

        {/* Main content grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left sidebar with subscription */}
          <div className="lg:col-span-1 order-3 lg:order-1">
            <SubscriptionStatus />
          </div>

          {/* Main content area */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-8">
            {/* Guide section - prominent at the top */}
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <AmazonGuide />
              </div>
            </div>

            {/* Upload and Optimization sections */}
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

            {/* Info cards at the bottom */}
            <InfoCards />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
