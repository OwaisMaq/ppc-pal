
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, Shield, Zap, Users, Mail, Building2, Sparkles, Star, LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import InfoCards from "@/components/InfoCards";

const PublicLanding = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    console.log('PublicLanding: Current URL:', window.location.href);
    console.log('PublicLanding: Current pathname:', window.location.pathname);
    console.log('PublicLanding: User:', user?.email || 'No user', 'Loading:', loading);
    
    // CRITICAL: This is a public page - NEVER redirect automatically
    console.log('PublicLanding: This is a public page, no redirects should happen');
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-black"></div>
      
      {/* Animated stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            <Star className="h-1 w-1 text-white opacity-60" fill="currentColor" />
          </div>
        ))}
      </div>

      {/* Large cosmic orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 relative z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-2 shadow-lg shadow-purple-500/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              PPC Pal
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/company" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
              Company
            </Link>
            <Link to="/about" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
              About
            </Link>
            <Link to="/contact" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
              Contact
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
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
          
          {/* Amazon Integration Highlight */}
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-400/30 rounded-lg p-6 mb-8 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-full p-2 shadow-lg shadow-orange-500/30">
                <LinkIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Direct Amazon Ads API Integration</h3>
            </div>
            <p className="text-orange-100 text-lg mb-4">
              Seamlessly connect your Amazon Advertising accounts for real-time campaign optimization and automated bid management.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/5 rounded-lg p-3 border border-orange-400/20">
                <div className="text-orange-300 font-medium mb-1">Secure Connection</div>
                <div className="text-orange-100">OAuth 2.0 authentication with Amazon</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-orange-400/20">
                <div className="text-orange-300 font-medium mb-1">Real-time Sync</div>
                <div className="text-orange-100">Live campaign data and performance metrics</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-orange-400/20">
                <div className="text-orange-300 font-medium mb-1">Auto Optimization</div>
                <div className="text-orange-100">AI-powered bid adjustments and keyword optimization</div>
              </div>
            </div>
          </div>
          
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

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
            How It Works
          </h2>
          <p className="text-lg text-purple-100 opacity-90">
            Get started with PPC Pal in three simple steps
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <InfoCards />
        </div>
      </section>

      {/* Features Section */}
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

      {/* Company Info Section */}
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

      {/* Footer */}
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
    </div>
  );
};

export default PublicLanding;
