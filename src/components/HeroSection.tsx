
import { Target } from "lucide-react";

const HeroSection = () => {
  return (
    <div className="text-center mb-12">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-blue-600 rounded-full p-3 mr-4">
          <Target className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">PPC Pal</h1>
      </div>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Upload your Amazon advertising data and let AI optimize your campaigns, keywords, and bids for maximum performance
      </p>
    </div>
  );
};

export default HeroSection;
