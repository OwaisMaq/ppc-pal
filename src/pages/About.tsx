import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Brain, TrendingUp, Shield, Zap, CheckCircle, Clock, DollarSign, Target } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-display font-semibold text-lg">PPC Pal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/company" className="text-muted-foreground hover:text-foreground transition-colors">Company</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden md:block">
              <Button variant="outline">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button>Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 lg:py-24">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">About Us</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            We make Amazon Ads simple
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            PPC Pal is an AI-powered automation platform that optimizes your Amazon advertising 24/7, 
            so you can focus on growing your business instead of tweaking bids.
          </p>
        </div>

        {/* The Problem We Solve */}
        <div className="mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">The Problem</p>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
                  Amazon PPC is a time sink
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Most sellers spend 10+ hours every week manually adjusting bids, hunting for wasted spend, 
                  and trying to make sense of endless spreadsheets. It's exhausting, error-prone, and takes 
                  you away from what actually grows your business.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Meanwhile, your competitors are outbidding you at 3am while you sleep. The Amazon marketplace 
                  never stops, but you can't be "on" 24/7.
                </p>
              </div>
              <div className="bg-muted/50 rounded-2xl p-8 border border-border">
                <h3 className="font-semibold text-foreground mb-6">Sound familiar?</h3>
                <ul className="space-y-4">
                  {[
                    "Spending Sunday nights in Seller Central",
                    "Watching ACoS creep up without knowing why",
                    "Bleeding money on keywords that don't convert",
                    "No time to analyze what's actually working"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Our Solution */}
        <div className="mb-20 py-16 border-y border-border bg-muted/30 -mx-4 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4">Our Solution</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                Set it and forget it optimization
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                PPC Pal connects to your Amazon Ads account and continuously optimizes your campaigns 
                using AI-powered automation. No spreadsheets. No manual bid adjustments. No stress.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-lg">24/7 Automation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Bids adjust automatically based on real-time performance. Your campaigns optimize 
                    while you sleep, eat, and live your life.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-lg">Smart Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    We identify winning keywords to scale and money-wasters to kill. 
                    Average seller saves $847/month on wasted clicks alone.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border sm:col-span-2 md:col-span-1">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-lg">Clear Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    No PhD required. See exactly what's working, what's not, and what we're doing 
                    about it—in plain English.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">Results</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Numbers that matter
              </h2>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { 
                  icon: DollarSign, 
                  metric: "23%", 
                  label: "Average savings",
                  description: "Less ad spend with the same or better sales"
                },
                { 
                  icon: TrendingUp, 
                  metric: "3.4x", 
                  label: "Average ROAS",
                  description: "Up from 2.1x before using PPC Pal"
                },
                { 
                  icon: Clock, 
                  metric: "10+", 
                  label: "Hours saved weekly",
                  description: "That's 520 hours back every year"
                }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-4xl font-display font-bold text-foreground mb-1">{item.metric}</p>
                  <p className="text-sm font-medium text-foreground mb-2">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20 py-16 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">How It Works</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                Up and running in under 5 minutes
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  step: "1", 
                  title: "Connect", 
                  description: "Link your Amazon Ads account with a single OAuth click. No API keys, no spreadsheet uploads."
                },
                { 
                  step: "2", 
                  title: "Analyze", 
                  description: "Our AI scans every campaign, keyword, and bid. You'll see opportunities within minutes."
                },
                { 
                  step: "3", 
                  title: "Optimize", 
                  description: "Automation kicks in. Bids adjust, keywords shift, waste disappears. You take the credit."
                }
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">
                      {item.step}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust & Security */}
        <div className="mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">Secure by Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Your data is encrypted in transit and at rest. We use OAuth for Amazon integration—
                    we never see or store your Amazon password.
                  </p>
                  <ul className="space-y-2">
                    {["Bank-level encryption", "SOC 2 compliant infrastructure", "GDPR ready"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">Trusted by Sellers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    Over 2,000 Amazon sellers trust PPC Pal with their advertising budgets. 
                    From side hustlers to 7-figure brands.
                  </p>
                  <ul className="space-y-2">
                    {["2,000+ active sellers", "Managing $10M+ in ad spend", "4.9/5 average rating"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-card border-border max-w-4xl mx-auto">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
              Ready to stop wasting money on Amazon Ads?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join 2,000+ sellers who are already saving time and money with PPC Pal. 
              Start your free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Talk to Sales
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
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="h-4 w-4" />
              </span>
              <span className="font-semibold text-foreground">PPC Pal</span>
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
