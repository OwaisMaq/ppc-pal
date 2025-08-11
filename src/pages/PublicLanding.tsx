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
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky minimal navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-semibold tracking-tight">PPC Pal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/company" className="transition-colors hover:text-foreground">Company</Link>
            <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
            <Link to="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button variant="pill" size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="hero" size="xl">Join the beta</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <HeroBackground imageUrl="/lovable-uploads/4b093e39-3730-4f0a-974c-c04971fa5913.png">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
            Smarter Amazon PPC. Cinematic simplicity.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Maximise ROAS with AI-driven bids, keyword harvesting, and budget pacing. Clean visuals, less noise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Zap className="mr-2 h-5 w-5" /> Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth" className="w-full sm:w-auto">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Zap className="mr-2 h-5 w-5" /> Start optimizing
                </Button>
              </Link>
            )}
            <Link to="/about" className="w-full sm:w-auto">
              <Button variant="pill" className="w-full sm:w-auto" size="xl">Learn more</Button>
            </Link>
          </div>
        </div>

        {/* App preview overlapping the fold */}
        <div className="mx-auto mt-12 max-w-5xl">
          <AppPreviewFrame>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <KpiChip label="Spend" value="$12.3k" change={{ value: '2.1%', direction: 'down' }} />
              <KpiChip label="Clicks" value="48,921" change={{ value: '5.4%', direction: 'up' }} />
              <KpiChip label="ACOS" value="24.6%" change={{ value: '1.2%', direction: 'down' }} />
              <KpiChip label="ROAS" value="4.1x" change={{ value: '3.0%', direction: 'up' }} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="p-4 lg:col-span-2">
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Last 7 days
                </div>
                <div className="h-48 rounded-lg bg-muted" aria-hidden />
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" /> Top keywords
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>organic vitamin c</span><span className="font-medium">ROAS 6.2x</span></div>
                  <div className="flex items-center justify-between"><span>kids gummies</span><span className="font-medium">ROAS 4.9x</span></div>
                  <div className="flex items-center justify-between"><span>beauty serum</span><span className="font-medium">ROAS 3.8x</span></div>
                </div>
              </Card>
            </div>
          </AppPreviewFrame>
        </div>
      </HeroBackground>

      {/* Value Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-6">Maximise ROAS, every day</h2>
            <ul className="space-y-4 text-base">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <div className="font-medium">Dynamic Bids</div>
                  <p className="text-muted-foreground">Continuous bid adjustments based on performance signals.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <div className="font-medium">Keyword Harvesting</div>
                  <p className="text-muted-foreground">Promote winners, pause waste, and mine search terms automatically.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <div className="font-medium">Budget Pacing</div>
                  <p className="text-muted-foreground">Avoid mid-day drop-offs and overspend with smart pacing.</p>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <DynamicGridCard />
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

      {/* Trust/CTA strip */}
      <section className="border-t py-10">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 text-center md:flex-row">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5" /> Data encrypted, OAuth with Amazon
          </div>
          <div className="flex gap-3">
            <Link to="/about"><Button variant="pill">Learn more</Button></Link>
            {user ? (
              <Link to="/dashboard"><Button variant="hero">Open dashboard</Button></Link>
            ) : (
              <Link to="/auth"><Button variant="hero">Join the beta</Button></Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
              <Bot className="h-4 w-4" />
            </span>
            <span>PPC Pal</span>
          </div>
          <span>© 2024 WISH AND WILLOW LTD • All rights reserved</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
