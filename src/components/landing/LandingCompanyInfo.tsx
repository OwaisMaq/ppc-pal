
import { Building2, Mail, MapPin } from "lucide-react";

const LandingCompanyInfo = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 w-fit mx-auto mb-6 shadow-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              About 
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                WISH AND WILLOW LTD
              </span>
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 border border-gray-100">
            <p className="text-lg lg:text-xl text-gray-600 leading-relaxed mb-8 text-center">
              WISH AND WILLOW LTD is a cutting-edge technology company specializing in AI-powered e-commerce optimization tools. 
              Our flagship product, PPC Pal, empowers Amazon sellers to optimize their advertising campaigns for maximum profitability 
              through intelligent automation and data-driven insights.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3 group">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full p-3 group-hover:from-indigo-200 group-hover:to-purple-200 transition-all duration-300">
                  <Mail className="h-5 w-5 text-indigo-600" />
                </div>
                <a 
                  href="mailto:info@ppcpal.online" 
                  className="text-lg text-gray-700 hover:text-indigo-600 transition-colors duration-300 font-medium"
                >
                  info@ppcpal.online
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full p-3">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-lg text-gray-700 font-medium">
                  United Kingdom
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCompanyInfo;
