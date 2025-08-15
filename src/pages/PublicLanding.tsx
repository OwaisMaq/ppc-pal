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
const PublicLanding = () => {
  const {
    user,
    loading
  } = useAuth();
  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    console.log('PublicLanding: Current URL:', window.location.href);
    console.log('PublicLanding: Current pathname:', window.location.pathname);
    console.log('PublicLanding: User:', user?.email || 'No user', 'Loading:', loading);
    console.log('PublicLanding: This is a public page, no redirects should happen');
    document.title = 'PPC Pal — AI Amazon PPC Optimizer';
  }, [user, loading]);
  return <div className="min-h-screen bg-background text-foreground">
      {/* Clean navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-semibold text-lg">PPC Pal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/company" className="transition-colors hover:text-primary">Company</Link>
            <Link to="/about" className="transition-colors hover:text-primary">About</Link>
            <Link to="/contact" className="transition-colors hover:text-primary">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link> : <Link to="/auth">
                <Button>Join the beta</Button>
              </Link>}
          </div>
        </div>
      </header>

      {/* Enhanced Hero */}
      <HeroBackground imageUrl="/lovable-uploads/4b093e39-3730-4f0a-974c-c04971fa5913.png">
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 md:text-8xl">
            PPC Re-imagined.
            <br />
            <span className="text-gray-400 text-5xl">Delegate your Amazon ads to AI</span>
          </h1>
          <p className="mt-8 text-muted-foreground leading-relaxed max-w-2xl mx-auto text-lg">AI-driven bids | campaign management| keyword harvesting| day parting  </p>
          
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? <Link to="/dashboard">
                <Button size="lg" className="px-8 py-3">
                  <Zap className="mr-2 h-5 w-5" /> Go to Dashboard
                </Button>
              </Link> : <Link to="/auth">
                <Button size="lg" className="px-8 py-3">
                  <Zap className="mr-2 h-5 w-5" /> Start optimizing
                </Button>
              </Link>}
            <Link to="/about">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Learn more
              </Button>
            </Link>
          </div>
        </div>

        {/* Enhanced app preview */}
        <div className="mx-auto mt-20 max-w-6xl animate-fade-in">
          <AppPreviewFrame>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <KpiChip label="Spend" value="$12.3k" change={{
              value: '2.1%',
              direction: 'down'
            }} />
              <KpiChip label="Clicks" value="48,921" change={{
              value: '5.4%',
              direction: 'up'
            }} />
              <KpiChip label="ACOS" value="24.6%" change={{
              value: '1.2%',
              direction: 'down'
            }} />
              <KpiChip label="ROAS" value="4.1x" change={{
              value: '3.0%',
              direction: 'up'
            }} />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> 
                  <span className="font-medium">Last 7 days</span>
                </div>
                <div className="h-48 rounded-lg bg-muted/30 flex items-center justify-center" aria-hidden>
                  <div className="text-muted-foreground text-sm">Performance Analytics Preview</div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" /> 
                  <span className="font-medium">Top keywords</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">organic vitamin c</span>
                    <span className="font-semibold">ROAS 6.2x</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">kids gummies</span>
                    <span className="font-semibold">ROAS 4.9x</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">beauty serum</span>
                    <span className="font-semibold">ROAS 3.8x</span>
                  </div>
                </div>
              </Card>
            </div>
          </AppPreviewFrame>
        </div>
      </HeroBackground>

      {/* Clean Value Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8 bg-transparent rounded-md">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight text-gray-300">
                  Maximise ROAS,
                  <br />
                  every single day
                </h2>
                <p className="text-lg text-gray-300">
                  Our AI-powered optimization engine works 24/7 to ensure your campaigns perform at their peak.
                </p>
              </div>
              
              <ul className="space-y-6 text-base">
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">Dynamic Bids</div>
                    <p className="text-muted-foreground leading-relaxed">Continuous bid adjustments based on performance signals and market conditions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">Keyword Harvesting</div>
                    <p className="text-muted-foreground leading-relaxed">Automatically promote winning search terms while eliminating wasteful spend.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg bg-transparent">Budget Pacing</div>
                    <p className="leading-relaxed text-gray-300">Smart budget distribution prevents mid-day drop-offs and overspend scenarios.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative">
              <DynamicGridCard />
            </div>
          </div>
        </div>
      </section>

      {/* Time Saver Section */}
      

      {/* Clean CTA Section */}
      <section className="py-20 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6">
              Ready to transform your Amazon PPC?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="h-5 w-5" /> 
                <span>Enterprise security & Amazon OAuth</span>
              </div>
              <div className="flex gap-4">
                <Link to="/about">
                  <Button variant="outline">Learn more</Button>
                </Link>
                {user ? <Link to="/dashboard">
                    <Button>Open dashboard</Button>
                  </Link> : <Link to="/auth">
                    <Button>Join the beta</Button>
                  </Link>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
    </div>;
};
export default PublicLanding;