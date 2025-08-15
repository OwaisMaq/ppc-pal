import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, CheckCircle2, Zap, Shield, CalendarDays, BarChart3 } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import AppPreviewFrame from "@/components/AppPreviewFrame";
import KpiChip from "@/components/KpiChip";
import DynamicGridCard from "@/components/DynamicGridCard";
import FeatureTile from "@/components/FeatureTile";
import TrustSection from "@/components/TrustSection";
import FloatingShapes from "@/components/FloatingShapes";

const PublicLanding = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    console.log('PublicLanding: Current URL:', window.location.href);
    console.log('PublicLanding: Current pathname:', window.location.pathname);
    console.log('PublicLanding: User:', user?.email || 'No user', 'Loading:', loading);
    console.log('PublicLanding: This is a public page, no redirects should happen');
    document.title = 'PPC Pal — AI Amazon PPC Optimizer';
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Global floating shapes */}
      <FloatingShapes density="light" className="fixed inset-0 z-0" />
      
      {/* Sticky enhanced navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-electric-green text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Bot className="h-6 w-6" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-electric-purple/20 to-electric-orange/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </span>
            <span className="font-bold tracking-tight text-lg">PPC Pal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/company" className="transition-colors hover:text-electric-purple">Company</Link>
            <Link to="/about" className="transition-colors hover:text-electric-purple">About</Link>
            <Link to="/contact" className="transition-colors hover:text-electric-purple">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button variant="pill" size="default" className="bg-gradient-to-r from-brand to-electric-green hover:shadow-lg">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="hero" size="lg" className="bg-gradient-to-r from-electric-purple to-electric-orange hover:shadow-xl animate-pulse-glow">
                  Join the beta
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Hero */}
      <HeroBackground imageUrl="/lovable-uploads/4b093e39-3730-4f0a-974c-c04971fa5913.png">
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <div className="animate-fade-in">
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-foreground via-electric-purple to-electric-orange bg-clip-text text-transparent">
                Smarter Amazon PPC.
              </span>
              <br />
              <span className="bg-gradient-to-r from-electric-green via-brand to-electric-blue bg-clip-text text-transparent">
                Cinematic simplicity.
              </span>
            </h1>
            <p className="mt-8 text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Maximise ROAS with AI-driven bids, keyword harvesting, and budget pacing. 
              <span className="text-electric-purple font-medium"> Clean visuals, less noise.</span>
            </p>
          </div>
          
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-scale-in">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button 
                  size="xl" 
                  className="w-full sm:w-auto bg-gradient-to-r from-brand to-electric-green hover:from-electric-green hover:to-brand shadow-2xl hover:shadow-electric-green/50 transition-all duration-300 text-white font-semibold px-8 py-4"
                >
                  <Zap className="mr-3 h-6 w-6" /> Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth" className="w-full sm:w-auto">
                <Button 
                  size="xl" 
                  className="w-full sm:w-auto bg-gradient-to-r from-electric-purple to-electric-orange hover:from-electric-orange hover:to-electric-purple shadow-2xl hover:shadow-electric-purple/50 transition-all duration-300 text-white font-semibold px-8 py-4 animate-pulse-glow"
                >
                  <Zap className="mr-3 h-6 w-6" /> Start optimizing
                </Button>
              </Link>
            )}
            <Link to="/about" className="w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="xl" 
                className="w-full sm:w-auto border-2 border-electric-purple/30 hover:border-electric-purple hover:bg-electric-purple/10 backdrop-blur-sm px-8 py-4"
              >
                Learn more
              </Button>
            </Link>
          </div>
        </div>

        {/* Enhanced app preview */}
        <div className="mx-auto mt-20 max-w-6xl animate-fade-in">
          <AppPreviewFrame>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <KpiChip label="Spend" value="$12.3k" change={{ value: '2.1%', direction: 'down' }} />
              <KpiChip label="Clicks" value="48,921" change={{ value: '5.4%', direction: 'up' }} />
              <KpiChip label="ACOS" value="24.6%" change={{ value: '1.2%', direction: 'down' }} />
              <KpiChip label="ROAS" value="4.1x" change={{ value: '3.0%', direction: 'up' }} />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-card to-muted/50 border-electric-purple/10">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-electric-blue" /> 
                  <span className="font-medium">Last 7 days</span>
                </div>
                <div className="h-48 rounded-xl bg-gradient-to-br from-electric-purple/5 to-electric-orange/5 border border-electric-purple/10 flex items-center justify-center" aria-hidden>
                  <div className="text-muted-foreground text-sm">Performance Analytics Preview</div>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-card to-muted/50 border-electric-orange/10">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-electric-orange" /> 
                  <span className="font-medium">Top keywords</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-electric-green/5">
                    <span>organic vitamin c</span>
                    <span className="font-semibold text-electric-green">ROAS 6.2x</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-electric-orange/5">
                    <span>kids gummies</span>
                    <span className="font-semibold text-electric-orange">ROAS 4.9x</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-electric-purple/5">
                    <span>beauty serum</span>
                    <span className="font-semibold text-electric-purple">ROAS 3.8x</span>
                  </div>
                </div>
              </Card>
            </div>
          </AppPreviewFrame>
        </div>
      </HeroBackground>

      {/* Enhanced Value Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-16 right-10 w-24 h-24 rounded-full bg-electric-blue/10 animate-float-slow blur-2xl" aria-hidden="true" />
        <div className="absolute bottom-20 left-16 w-32 h-32 rounded-lg bg-electric-purple/10 animate-float rotate-12 blur-2xl" aria-hidden="true" />
        
        <div className="container mx-auto px-4 relative">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-electric-purple to-electric-orange bg-clip-text text-transparent">
                    Maximise ROAS,
                  </span>
                  <br />
                  every single day
                </h2>
                <p className="text-lg text-muted-foreground">
                  Our AI-powered optimization engine works 24/7 to ensure your campaigns perform at their peak.
                </p>
              </div>
              
              <ul className="space-y-6 text-base">
                <li className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-electric-purple/20 to-electric-purple/10 flex items-center justify-center group-hover:from-electric-purple/40 group-hover:to-electric-purple/20 transition-all duration-300">
                    <CheckCircle2 className="h-4 w-4 text-electric-purple" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg text-electric-purple">Dynamic Bids</div>
                    <p className="text-muted-foreground leading-relaxed">Continuous bid adjustments based on performance signals and market conditions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-electric-orange/20 to-electric-orange/10 flex items-center justify-center group-hover:from-electric-orange/40 group-hover:to-electric-orange/20 transition-all duration-300">
                    <CheckCircle2 className="h-4 w-4 text-electric-orange" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg text-electric-orange">Keyword Harvesting</div>
                    <p className="text-muted-foreground leading-relaxed">Automatically promote winning search terms while eliminating wasteful spend.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-electric-green/20 to-electric-green/10 flex items-center justify-center group-hover:from-electric-green/40 group-hover:to-electric-green/20 transition-all duration-300">
                    <CheckCircle2 className="h-4 w-4 text-electric-green" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg text-electric-green">Budget Pacing</div>
                    <p className="text-muted-foreground leading-relaxed">Smart budget distribution prevents mid-day drop-offs and overspend scenarios.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative">
              {/* Floating accent shapes around the card */}
              <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-electric-purple/30 animate-float blur-sm" aria-hidden="true" />
              <div className="absolute -bottom-6 -left-6 w-6 h-6 rounded-sm bg-electric-orange/30 animate-float-slow rotate-45 blur-sm" aria-hidden="true" />
              <DynamicGridCard />
            </div>
          </div>
        </div>
      </section>

      {/* Time Saver Section */}
      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-8">Your time’s valuable</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureTile
            title="Automatic Bid Adjustments"
            subtitle="Always-on optimisation"
            imageUrl="/lovable-uploads/47be75a0-13ac-45cd-bad8-df3a6e6237a7.png"
          />
          <FeatureTile
            title="Keyword Harvesting"
            subtitle="Mine winners, prune waste"
            imageUrl="/lovable-uploads/bda7d203-91b5-4329-947b-2ce46773ed8e.png"
          />
          <FeatureTile
            title="Budget Pacing Alerts"
            subtitle="Stay within targets"
          />
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-electric-purple/5 via-transparent to-electric-orange/5 border-t border-border/30">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-electric-purple/5 to-electric-orange/5 blur-3xl" aria-hidden="true" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 bg-gradient-to-r from-electric-purple to-electric-orange bg-clip-text text-transparent">
              Ready to transform your Amazon PPC?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="h-5 w-5 text-electric-green" /> 
                <span>Enterprise security & Amazon OAuth</span>
              </div>
              <div className="flex gap-4">
                <Link to="/about">
                  <Button variant="outline" className="border-electric-purple/30 hover:border-electric-purple hover:bg-electric-purple/10">
                    Learn more
                  </Button>
                </Link>
                {user ? (
                  <Link to="/dashboard">
                    <Button className="bg-gradient-to-r from-electric-purple to-electric-orange hover:shadow-xl text-white font-semibold">
                      Open dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth">
                    <Button className="bg-gradient-to-r from-electric-purple to-electric-orange hover:shadow-xl text-white font-semibold animate-pulse-glow">
                      Join the beta
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t border-border/30 bg-gradient-to-r from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-electric-green text-white shadow-lg">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold text-foreground text-base">PPC Pal</div>
                <div className="text-xs">AI-Powered PPC Optimization</div>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="font-medium">© 2024 WISH AND WILLOW LTD</div>
              <div className="text-xs">All rights reserved</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
