
import { Button } from "@/components/ui/button";
import { Zap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface LandingHeroProps {
  user: any;
}

const LandingHero = ({ user }: LandingHeroProps) => {
  return (
    <section className="container mx-auto px-4 py-16 text-center relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 relative">
          <Sparkles className="absolute -top-4 -left-4 h-8 w-8 text-purple-400 animate-pulse" />
          <Sparkles className="absolute -top-2 -right-6 h-6 w-6 text-blue-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-6 leading-tight">
            Optimize Your Amazon PPC Campaigns with AI
          </h1>
        </div>
        <p className="text-xl text-purple-100 mb-8 leading-relaxed opacity-90">
          PPC Pal uses advanced artificial intelligence to analyze and optimize your Amazon advertising campaigns, 
          helping you increase sales while reducing wasted ad spend in the vast digital cosmos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/40 transition-all duration-300 hover:scale-105 border border-purple-400/30">
                <Zap className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/40 transition-all duration-300 hover:scale-105 border border-purple-400/30">
                <Zap className="mr-2 h-5 w-5" />
                Start Optimizing Now
              </Button>
            </Link>
          )}
          <Link to="/about">
            <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-purple-400/50 text-purple-200 hover:bg-purple-900/50 hover:text-white transition-all duration-300 hover:scale-105">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
