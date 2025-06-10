
import { useState } from "react";
import { toast } from "sonner";
import { optimizeAdvertisingData } from "@/lib/aiOptimizer";
import { exportToExcel } from "@/lib/excelProcessor";
import { AdvertisingData } from "@/pages/Index";
import { useSubscription } from "@/hooks/useSubscription";

export const useOptimization = () => {
  const [uploadedData, setUploadedData] = useState<AdvertisingData | null>(null);
  const [optimizedData, setOptimizedData] = useState<AdvertisingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const { checkCanOptimize, incrementUsage, isFreeTier, refreshSubscription } = useSubscription();

  const handleFileUpload = (data: AdvertisingData) => {
    setUploadedData(data);
    setOptimizedData(null);
    toast.success("Amazon advertising data uploaded successfully!");
  };

  const handleOptimize = async () => {
    if (!uploadedData) return;

    // Check if user can optimize before starting
    const canOptimize = await checkCanOptimize();
    
    if (!canOptimize) {
      if (isFreeTier) {
        toast.error("Free plan doesn't include optimizations. Please upgrade to Pro to access this feature.");
      } else {
        toast.error("You've reached your monthly optimization limit. Please wait for next month or contact support.");
      }
      return;
    }

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
      
      // Increment usage count after successful optimization
      const usageIncremented = await incrementUsage();
      
      if (!usageIncremented) {
        toast.error("Failed to track usage. Please contact support.");
        return;
      }
      
      setOptimizedData(optimized);
      setProgress(100);
      setCurrentStep("Optimization complete!");
      
      // Refresh subscription data to show updated usage
      await refreshSubscription();
      
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

  return {
    uploadedData,
    optimizedData,
    isProcessing,
    progress,
    currentStep,
    handleFileUpload,
    handleOptimize,
    handleDownload
  };
};
