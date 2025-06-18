
import { Building2, Mail } from "lucide-react";

const LandingCompanyInfo = () => {
  return (
    <section className="bg-black/30 backdrop-blur-md border-t border-purple-500/20 relative z-10">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-3 w-fit mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
            About WISH AND WILLOW LTD
          </h2>
          <p className="text-lg text-purple-100 mb-6 opacity-90">
            WISH AND WILLOW LTD is a technology company specializing in AI-powered e-commerce optimization tools. 
            Our flagship product, PPC Pal, helps Amazon sellers optimize their advertising campaigns for maximum profitability.
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-200">
            <Mail className="h-4 w-4" />
            <a href="mailto:info@ppcpal.online" className="hover:text-white transition-colors duration-300 hover:scale-105 inline-block">
              info@ppcpal.online
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCompanyInfo;
