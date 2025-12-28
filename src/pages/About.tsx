import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Brain, TrendingUp, Shield, Zap, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/ppcpal-logo.jpg" 
              alt="PPC Pal" 
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-xl font-semibold text-foreground">PPC Pal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/company" className="text-muted-foreground hover:text-foreground transition-colors">
              Company
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
          
          <Link to="/" className="md:hidden">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Brain className="h-4 w-4" />
            About Us
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            About PPC Pal
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            The AI-powered platform that's revolutionizing Amazon PPC campaign optimization for sellers worldwide
          </p>
        </div>

        {/* What We Do */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              What We Do
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Our Capabilities</h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-muted-foreground text-center mb-8">
              PPC Pal uses advanced artificial intelligence to analyze your Amazon advertising campaigns and 
              provide intelligent optimization recommendations. Our platform processes vast amounts of campaign 
              data to identify patterns, trends, and opportunities that human analysis might miss.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <Brain className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-foreground">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our machine learning algorithms analyze campaign performance, keyword data, and market trends 
                    to identify optimization opportunities.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <TrendingUp className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-foreground">Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get actionable insights on bid adjustments, keyword management, and budget allocation 
                    to maximize your return on ad spend.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-foreground">Automated Implementation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Export optimized campaign data in Amazon-compatible formats for quick and easy 
                    implementation of recommended changes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16 py-12 border-y border-border">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              How It Works
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Our Process</h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Connect Amazon Account</h3>
                      <p className="text-muted-foreground">
                        Securely connect your Amazon Ads account to sync campaign data automatically.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">AI Analysis</h3>
                      <p className="text-muted-foreground">
                        Our AI algorithms analyze your campaign performance and identify optimization opportunities.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Implement Changes</h3>
                      <p className="text-muted-foreground">
                        Use our recommendations to optimize campaigns directly in Amazon's interface.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Key Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Increase ROI by up to 40%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Save 10+ hours per week</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Reduce wasted ad spend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Data-driven decision making</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Enterprise-grade security</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              Technology
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Our Technology</h2>
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-muted-foreground mb-8">
              Built on cutting-edge machine learning and artificial intelligence technologies, 
              PPC Pal represents the next generation of e-commerce optimization tools.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle className="text-foreground">Secure & Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your data is encrypted in transit and at rest. We follow industry best practices 
                    for data security and privacy protection.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <Brain className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle className="text-foreground">Advanced AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our proprietary algorithms continuously learn and improve, adapting to market 
                    changes and campaign performance patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ready to Optimize Your Campaigns?</h2>
            <p className="text-lg text-muted-foreground mb-8">
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
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-muted border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img 
                src="/ppcpal-logo.jpg" 
                alt="PPC Pal" 
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-lg font-semibold text-foreground">PPC Pal</span>
            </div>
            
            <div className="flex items-center gap-6 mb-4 md:mb-0">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Terms
              </Link>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm">© 2024 WISH AND WILLOW LTD. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
