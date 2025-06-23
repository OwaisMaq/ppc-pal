
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface LandingHeroProps {
  user: any;
}

const LandingHero = ({ user }: LandingHeroProps) => {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-indigo-200">
            <TrendingUp className="h-4 w-4" />
            AI-Powered PPC Optimization
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your 
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent block">
              Amazon PPC
            </span>
            Performance
          </h1>

          {/* Subtitle */}
          <p className="text-xl lg:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Leverage advanced AI to optimize your Amazon advertising campaigns, 
            increase sales, and reduce wasted ad spend with intelligent automation.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg px-8 py-4 h-14 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                  <Zap className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg px-8 py-4 h-14 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                  <Zap className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                  Start Optimizing Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
            <Link to="/about">
              <Button variant="outline" size="lg" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-4 h-14 hover:scale-105 transition-all duration-300">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-indigo-600 mb-2">25%</div>
              <div className="text-gray-600 text-sm lg:text-base">Average ROI Increase</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">40%</div>
              <div className="text-gray-600 text-sm lg:text-base">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">15%</div>
              <div className="text-gray-600 text-sm lg:text-base">Cost Reduction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
