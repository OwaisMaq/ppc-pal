
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Zap, Shield } from "lucide-react";

const LandingFeatures = () => {
  return (
    <section className="container mx-auto px-4 py-16 relative z-10">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
          Why Choose PPC Pal?
        </h2>
        <p className="text-lg text-purple-100 opacity-90">
          Our AI-powered platform delivers results that matter to your business
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="bg-black/20 backdrop-blur-md border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
          <CardHeader>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2 w-fit mb-2 shadow-lg shadow-green-500/30">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-white">Increase ROI</CardTitle>
            <CardDescription className="text-purple-200">
              Our AI algorithms identify the best performing keywords and optimize bids to maximize your return on ad spend.
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="bg-black/20 backdrop-blur-md border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
          <CardHeader>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-2 w-fit mb-2 shadow-lg shadow-yellow-500/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-white">Save Time</CardTitle>
            <CardDescription className="text-purple-200">
              Automate campaign optimization tasks that would take hours to do manually. Focus on growing your business instead.
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="bg-black/20 backdrop-blur-md border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
          <CardHeader>
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-2 w-fit mb-2 shadow-lg shadow-blue-500/30">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-white">Data Security</CardTitle>
            <CardDescription className="text-purple-200">
              Your campaign data is encrypted and secure. We follow industry best practices to protect your business information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
};

export default LandingFeatures;
