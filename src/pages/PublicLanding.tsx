
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, Shield, Zap, Users, Mail, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const PublicLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PPC Pal</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/company" className="text-gray-600 hover:text-blue-600 transition-colors">
              Company
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Optimize Your Amazon PPC Campaigns with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            PPC Pal uses advanced artificial intelligence to analyze and optimize your Amazon advertising campaigns, 
            helping you increase sales while reducing wasted ad spend.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Start Optimizing Now
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose PPC Pal?
          </h2>
          <p className="text-lg text-gray-600">
            Our AI-powered platform delivers results that matter to your business
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Increase ROI</CardTitle>
              <CardDescription>
                Our AI algorithms identify the best performing keywords and optimize bids to maximize your return on ad spend.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Save Time</CardTitle>
              <CardDescription>
                Automate campaign optimization tasks that would take hours to do manually. Focus on growing your business instead.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Data Security</CardTitle>
              <CardDescription>
                Your campaign data is encrypted and secure. We follow industry best practices to protect your business information.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              About WISH AND WILLOW LTD
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              WISH AND WILLOW LTD is a technology company specializing in AI-powered e-commerce optimization tools. 
              Our flagship product, PPC Pal, helps Amazon sellers optimize their advertising campaigns for maximum profitability.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <a href="mailto:info@ppcpal.online" className="hover:text-blue-600 transition-colors">
                info@ppcpal.online
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="bg-blue-600 rounded-full p-2">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-semibold">PPC Pal</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-400 mb-1">© 2024 WISH AND WILLOW LTD</p>
              <p className="text-gray-400">All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
