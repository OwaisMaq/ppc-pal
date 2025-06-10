
import { Bot } from "lucide-react";
import HolidayReminder from "@/components/HolidayReminder";
import ComingSoon from "@/components/ComingSoon";
import { LinkIcon, Settings } from "lucide-react";
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
    </div>
  );
};

export default HeroSection;
