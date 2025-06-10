
import { useState } from "react";
import { toast } from "sonner";
import { optimizeAdvertisingData } from "@/lib/aiOptimizer";
import { exportToExcel } from "@/lib/excelProcessor";
import { AdvertisingData } from "@/pages/Index";

export const useOptimization = () => {
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
