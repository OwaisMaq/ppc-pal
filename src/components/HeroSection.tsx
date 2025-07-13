
import { Bot } from "lucide-react";
import HolidayReminder from "@/components/HolidayReminder";
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
    </div>
  );
};

export default HeroSection;
