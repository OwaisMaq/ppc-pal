
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Brain, TrendingUp, Shield, Zap, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PPC Pal</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/company" className="text-gray-600 hover:text-blue-600 transition-colors">
              Company
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

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About PPC Pal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The AI-powered platform that's revolutionizing Amazon PPC campaign optimization for sellers worldwide
          </p>
        </div>

        {/* What We Do */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">What We Do</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-gray-600 text-center mb-8">
              PPC Pal uses advanced artificial intelligence to analyze your Amazon advertising campaigns and 
              provide intelligent optimization recommendations. Our platform processes vast amounts of campaign 
              data to identify patterns, trends, and opportunities that human analysis might miss.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Brain className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Our machine learning algorithms analyze campaign performance, keyword data, and market trends 
                    to identify optimization opportunities.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Get actionable insights on bid adjustments, keyword management, and budget allocation 
                    to maximize your return on ad spend.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Automated Implementation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Export optimized campaign data in Amazon-compatible formats for quick and easy 
                    implementation of recommended changes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Connect Amazon Account</h3>
                      <p className="text-gray-600">
                        Securely connect your Amazon Ads account to sync campaign data automatically.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
                      <p className="text-gray-600">
                        Our AI algorithms analyze your campaign performance and identify optimization opportunities.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Implement Changes</h3>
                      <p className="text-gray-600">
                        Use our recommendations to optimize campaigns directly in Amazon's interface.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Benefits</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Increase ROI by up to 40%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Save 10+ hours per week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Reduce wasted ad spend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Data-driven decision making</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Enterprise-grade security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Our Technology</h2>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-600 mb-8">
              Built on cutting-edge machine learning and artificial intelligence technologies, 
              PPC Pal represents the next generation of e-commerce optimization tools.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-blue-600 mb-2 mx-auto" />
                  <CardTitle>Secure & Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Your data is encrypted in transit and at rest. We follow industry best practices 
                    for data security and privacy protection.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Brain className="h-8 w-8 text-blue-600 mb-2 mx-auto" />
                  <CardTitle>Advanced AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Our proprietary algorithms continuously learn and improve, adapting to market 
                    changes and campaign performance patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg border border-gray-200 p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Optimize Your Campaigns?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of Amazon sellers who are already using PPC Pal to maximize their advertising ROI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>

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

export default About;
