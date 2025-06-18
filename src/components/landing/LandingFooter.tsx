
import { Bot } from "lucide-react";

const LandingFooter = () => {
  return (
    <footer className="bg-black/40 backdrop-blur-md text-white border-t border-purple-500/20 relative z-10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-2 shadow-lg shadow-purple-500/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              PPC Pal
            </span>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-purple-200 mb-1">© 2024 WISH AND WILLOW LTD</p>
            <p className="text-purple-300">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
