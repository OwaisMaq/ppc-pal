
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, Shield, Zap, Mail } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              PPC Pal
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/company" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Company
            </Link>
            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              About
            </Link>
            <Link to="/contact" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Contact
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            {user ? (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-4 mr-4">
              <Bot className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
              PPC Pal
            </h1>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">
            AI-Powered Amazon PPC Optimization
          </h2>
          
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Transform your Amazon advertising campaigns with intelligent automation. 
            Our AI analyzes performance data and optimizes your PPC campaigns for maximum ROI.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 inline-block">
            <p className="text-blue-800 font-medium">
              ✨ Direct Amazon Ads API Integration - Real-time data synchronization
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600">
              Get started with PPC Pal in three simple steps
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <InfoCards />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Why Choose PPC Pal?
          </h2>
          <p className="text-lg text-slate-600">
            Powerful features to supercharge your Amazon advertising
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-slate-900">Increase ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 text-center">
                AI-driven optimization strategies to maximize your return on advertising spend.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-slate-900">Save Time</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 text-center">
                Automate tedious campaign management tasks and focus on strategy.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-slate-900">Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 text-center">
                Enterprise-grade security to protect your valuable advertising data.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Trusted by Amazon Sellers Worldwide
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-2">150%</div>
              <p className="text-slate-600">Average ROI Improvement</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-2">75%</div>
              <p className="text-slate-600">Time Saved on Campaign Management</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">500+</div>
              <p className="text-slate-600">Active Users</p>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-2xl mx-auto shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">About WISH AND WILLOW LTD</h3>
          <p className="text-slate-600 mb-6">
            We're dedicated to empowering Amazon sellers with cutting-edge AI technology 
            to optimize their advertising campaigns and maximize profitability.
          </p>
          <div className="flex items-center justify-center text-slate-600">
            <Mail className="h-5 w-5 mr-2" />
            <span>contact@wishandwillow.com</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-2 mr-3">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-medium">PPC Pal</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2024 WISH AND WILLOW LTD. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
