import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserCount, formatUserCount } from "@/hooks/useUserCount";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bot, 
  ChevronRight, 
  ChevronDown,
  Star,
  Check,
  ArrowRight,
  Briefcase,
  User,
  TrendingUp,
  Sparkles,
  Crown
} from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import infiniteWorldLogo from "@/assets/infinite-world-logo.jpg";
import wishAndWillowLogo from "@/assets/wish-and-willow-logo.jpg";
import {
  DashboardPreview,
  AutomationPreview,
  KeywordsPreview,
  AnalyticsPreview,
  SavingsPreview,
  ConnectPreview,
  AnalyzePreview,
  OptimizePreview
} from "@/components/landing";
import TrustBadges, { AmazonPartnerBadge, LiveStatsBadge, ManagedSpendBadge } from "@/components/landing/TrustBadges";
import LiveAutomationFeed from "@/components/landing/LiveAutomationFeed";
import ROICalculator from "@/components/landing/ROICalculator";

const PublicLanding = () => {
  const { user } = useAuth();
  const { data: userCount } = useUserCount();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const displayCount = formatUserCount(userCount || 0);

  useEffect(() => {
    document.title = "PPC Pal — Stop Wasting Money on Amazon Ads";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground md:snap-none snap-y snap-mandatory overflow-y-auto overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </span>
            <span className="font-display font-semibold text-lg">PPC Pal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/overview">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button>Start free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - includes trusted brands on mobile */}
      <section className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-0 md:py-20 lg:py-28 py-8 overflow-hidden flex items-center snap-start">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            <div className="space-y-4 md:space-y-6">
              {/* Trust Badges Row */}
              <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-xs md:text-sm font-medium text-amber-800 dark:text-amber-200">
                  <span>👋</span> Bye-bye, messy spreadsheets
                </div>
                <AmazonPartnerBadge />
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
                Amazon Ads,{" "}
                <span className="relative inline-block">
                  Simplified.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C50 2 150 2 198 8" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" className="animate-[draw_1s_ease-out_forwards]" strokeDasharray="200" strokeDashoffset="200" style={{ animation: 'draw 1s ease-out 0.5s forwards' }}/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
                We optimize your bids 24/7 so you can focus on growing your brand (or sleeping).
              </p>
              
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 rounded-full px-6 md:px-8 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-sm md:text-base group relative overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                      Start Free Trial <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
                <a href="#features" className="group hidden sm:block">
                  <Button variant="outline" size="lg" className="gap-2 rounded-full px-6">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </span>
                    Watch Demo
                  </Button>
                </a>
              </div>
              
              {/* Risk Reduction Badges */}
              <div className="pt-2">
                <TrustBadges variant="compact" />
              </div>
              
              {/* Social Proof */}
              <div className="flex items-center gap-3 md:gap-4 pt-2">
                <div className="flex -space-x-2">
                  {[
                    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500"
                  ].map((color, i) => (
                    <div 
                      key={i}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-xs font-medium`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {['M', 'S', 'J', 'A'][i]}
                    </div>
                  ))}
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                    +{displayCount.replace('+', '')}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Trusted by <span className="font-semibold text-foreground">{displayCount}</span> sellers
                </p>
              </div>
              
              {/* Trusted By - Integrated in hero on mobile */}
              <div className="pt-4 border-t border-border md:hidden">
                <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-3">
                  Powering Top Brands
                </p>
                <div className="flex items-center gap-6">
                  <img 
                    src={infiniteWorldLogo} 
                    alt="Infinite World" 
                    className="h-8 w-auto object-contain opacity-70"
                  />
                  <img 
                    src={wishAndWillowLogo} 
                    alt="Wish & Willow" 
                    className="h-8 w-auto object-contain opacity-70"
                  />
                </div>
              </div>
            </div>
            
            {/* Hero Image - Desktop only */}
            <div className="relative hidden md:block">
              {/* Floating Metric Card - Top Right */}
              <div className="absolute -top-4 -right-4 lg:right-0 z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="bg-background rounded-xl shadow-xl border border-border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Profit</p>
                    <p className="text-lg font-display font-bold text-emerald-600">+$452.20</p>
                  </div>
                </div>
              </div>
              
              {/* Main Dashboard */}
              <div className="transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
                <DashboardPreview />
              </div>
              
              {/* Floating Status Card - Bottom Left */}
              <div className="absolute -bottom-4 -left-4 lg:left-8 z-10 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="bg-background rounded-xl shadow-xl border border-border p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-Optimization</p>
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section - Desktop only */}
      <section className="hidden md:block md:py-12 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Brand logos */}
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6 lg:mb-0 lg:hidden text-center">
                Powering Top Brands Globally
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-12">
                <p className="hidden lg:block text-xs font-medium text-muted-foreground tracking-widest uppercase">
                  Trusted By
                </p>
                <div className="flex items-center gap-10">
                  <img 
                    src={infiniteWorldLogo} 
                    alt="Infinite World" 
                    className="h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  />
                  <img 
                    src={wishAndWillowLogo} 
                    alt="Wish & Willow" 
                    className="h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            </div>
            
            {/* Right: Live Stats */}
            <div className="flex items-center gap-4">
              <LiveStatsBadge actionsToday={1247} />
            </div>
          </div>
        </div>
      </section>
      
      {/* Live Automation Feed Section */}
      <section className="hidden md:block py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Real-Time Optimization</p>
              <h2 className="text-2xl lg:text-3xl font-display font-bold mb-4">
                Automation that never sleeps
              </h2>
              <p className="text-muted-foreground mb-6">
                Our rule-based engine scans your campaigns around the clock, making data-driven 
                adjustments to bids, budgets, and keywords. No guesswork — just proven optimization logic.
              </p>
              <Link to="/auth">
                <Button className="gap-2">
                  See it in action <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <LiveAutomationFeed />
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-0 md:py-20 lg:py-28 py-8 relative overflow-hidden flex items-center snap-start">
        {/* Section background with subtle pattern */}
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header */}
          <div className="text-center mb-4 md:mb-16 lg:mb-20">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-2 md:mb-4">Capabilities</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-2 md:mb-4">
              Your unfair advantage
            </h2>
          </div>
          
          {/* Mobile: Stacked compact cards */}
          <div className="md:hidden space-y-3">
            {[
              { iconBg: "bg-primary/10", iconColor: "bg-primary", label: "Automation", title: "Works while you sleep" },
              { iconBg: "bg-destructive/10", iconColor: "bg-destructive", label: "Keywords", title: "Kill the money-wasters" },
              { iconBg: "bg-blue-500/10", iconColor: "bg-blue-500", label: "Analytics", title: "Numbers that make sense" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", item.iconBg)}>
                  <div className={cn("w-3 h-3 rounded-full", item.iconColor)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <h3 className="text-base font-display font-semibold leading-tight truncate">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-8 lg:gap-12 items-start">
            {/* Automation Card */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Automation</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  Works while you sleep
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  3am bid adjustments? Done. Weekend optimization? Handled. Your campaigns never take a day off.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <AutomationPreview />
              </div>
            </div>
            
            {/* Keywords Card */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-sm bg-destructive" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Keywords</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  Kill the money-wasters
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Spot bleeding keywords before they drain your budget. Average seller saves $847/month on wasted clicks.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <KeywordsPreview />
              </div>
            </div>
            
            {/* Analytics Card */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <div className="w-4 h-2 rounded-sm bg-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Analytics</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  Numbers that make sense
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No PhD required. See exactly what's working, what's not, and what to do about it.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <AnalyticsPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-0 md:py-20 lg:py-28 py-8 relative border-t border-border flex items-center snap-start">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-4 md:mb-16 lg:mb-20">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Results</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-2 md:mb-4">
              Real results
            </h2>
          </div>
          
          {/* Mobile: Stacked metric cards */}
          <div className="md:hidden space-y-3">
            {[
              { metric: "23%", label: "less spend", desc: "Same sales, bigger margin" },
              { metric: "3.4x", label: "ROAS", desc: "Average improvement" },
              { metric: "10h", label: "saved/week", desc: "Automated optimization" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border">
                <div className="w-16 text-center flex-shrink-0">
                  <p className="text-2xl font-display font-bold text-emerald-600">{item.metric}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                </div>
                <div className="h-8 w-px bg-border flex-shrink-0" />
                <p className="text-sm text-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-8 lg:gap-12 items-start">
            {/* Savings */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent" />
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">%</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Savings</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  23% less spend, same sales
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  That's the average. Some hit 40%. Imagine what you'd do with that extra margin.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <SavingsPreview />
              </div>
            </div>
            
            {/* Returns */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4l3-9 6 18 3-9h4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Returns</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  ROAS that makes accountants smile
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Average improvement: 2.1x → 3.4x. Your finance team will send thank you cards.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <AnalyticsPreview />
              </div>
            </div>
            
            {/* Time */}
            <div className="group flex flex-col h-full">
              <div className="min-h-[160px] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent animate-spin" style={{ animationDuration: '2s' }} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Time</p>
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-3 leading-tight">
                  10+ hours back every week
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  That's 520 hours a year. Launch a new product. Take a vacation. Remember what weekends feel like.
                </p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <OptimizePreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-0 md:py-20 lg:py-28 py-8 relative overflow-hidden flex items-center snap-start">
        {/* Section background */}
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header */}
          <div className="text-center mb-6 md:mb-16 lg:mb-20">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-2 md:mb-4">Process</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-2 md:mb-4">
              Stupid simple setup
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              <span className="text-foreground font-medium">Under 5 minutes</span>, we promise.
            </p>
          </div>
          
          {/* Mobile: Horizontal steps */}
          <div className="md:hidden flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
            {[
              { step: 1, title: "Connect", desc: "One OAuth flow. No API keys." },
              { step: 2, title: "Analyze", desc: "AI scans every campaign." },
              { step: 3, title: "Optimize", desc: "Bids adjust automatically." }
            ].map((item, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] snap-center bg-background rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">{item.step}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Steps connector line - desktop only */}
          <div className="hidden md:block absolute top-[340px] left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Connect */}
            <div className="group flex flex-col space-y-6">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <ConnectPreview />
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center gap-4 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">1</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-2">
                  Connect
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  One OAuth flow. No spreadsheet uploads. No API keys to hunt down.
                </p>
              </div>
            </div>
            
            {/* Analyze */}
            <div className="group flex flex-col space-y-6">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <AnalyzePreview />
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center gap-4 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">2</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-2">
                  Analyze
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our AI scans every campaign, keyword, and bid. Opportunities surface within minutes.
                </p>
              </div>
            </div>
            
            {/* Optimize */}
            <div className="group flex flex-col space-y-6">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <OptimizePreview />
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center gap-4 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">3</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-xl lg:text-2xl font-display font-semibold mb-2">
                  Optimize
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automation kicks in. Bids adjust. Waste disappears. You take the credit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-0 md:py-20 lg:py-28 py-8 relative border-t border-border flex items-center snap-start">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-4 md:mb-16 lg:mb-20">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Testimonials</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold">
              What sellers say
            </h2>
          </div>
          
          {/* Mobile: Stacked testimonial cards */}
          <div className="md:hidden space-y-3">
            {[
              { name: "Marcus C.", quote: "Same revenue, 10x better life.", metric: "10x" },
              { name: "Sarah W.", quote: "ACoS from 42% to 18% in 3 weeks.", metric: "24%" },
              { name: "James R.", quote: "Connected in 3 min, savings in 3 days.", metric: "3 min" }
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-muted-foreground">{t.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <span className="text-sm font-display font-bold text-primary flex-shrink-0">{t.metric}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{t.quote}"</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                stars: 5,
                quote: "I used to spend Sunday nights tweaking bids. Now I spend them with my kids. Same revenue, 10x better life.",
                name: "Marcus Chen",
                role: "Electronics Brand Owner",
                company: "TechFlow Products",
                metric: "10x",
                metricLabel: "better life",
                beforeAfter: "20h → 2h/week",
                avatarColor: "bg-blue-500"
              },
              {
                stars: 5,
                quote: "Cut my ACoS from 42% to 18% in three weeks. My CFO asked what changed. I just smiled.",
                name: "Sarah Williams",
                role: "CEO & Founder",
                company: "HomeNest Co.",
                metric: "42%→18%",
                metricLabel: "ACoS",
                beforeAfter: "-24% ACoS",
                avatarColor: "bg-emerald-500"
              },
              {
                stars: 5,
                quote: "Finally, a PPC tool that doesn't require a PhD to use. Connected in 3 minutes, saw savings in 3 days.",
                name: "James Rodriguez",
                role: "Supplements Entrepreneur",
                company: "VitaPure Labs",
                metric: "3 min",
                metricLabel: "setup",
                beforeAfter: "$2.4K saved/mo",
                avatarColor: "bg-purple-500"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="group relative p-6 lg:p-8 hover:shadow-lg transition-all duration-300 overflow-hidden">
                {/* Before/After Badge */}
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {testimonial.beforeAfter}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-0.5 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star 
                      key={j} 
                      className={cn(
                        "h-4 w-4",
                        j < testimonial.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                      )} 
                    />
                  ))}
                </div>
                <blockquote className="text-sm lg:text-base mb-8 leading-relaxed text-foreground/90">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold",
                    testimonial.avatarColor
                  )}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    <p className="text-[10px] text-primary font-medium">{testimonial.company}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Trust indicator - desktop only */}
          <div className="hidden md:block mt-16 text-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-muted/50 border border-border">
              <div className="flex -space-x-3">
                {['M', 'S', 'J', 'A'].map((initial, i) => (
                  <div 
                    key={i} 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-background flex items-center justify-center text-sm font-medium text-primary"
                  >
                    {initial}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{displayCount.replace('+', '')}
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{displayCount} sellers</p>
                <p className="text-xs text-muted-foreground">trust PPC Pal with their budgets</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="min-h-[100dvh] md:min-h-0 md:py-20 lg:py-28 py-12 relative overflow-hidden flex items-center snap-start">
        {/* Section background */}
        <div className="absolute inset-0 bg-muted/40" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header with badge */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Plans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Simple pricing
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Pick the plan that matches your operation.
            </p>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center rounded-lg border border-border p-1 bg-background">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  billingCycle === 'monthly' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  billingCycle === 'yearly' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* ROI Calculator */}
            <div className="md:col-span-1 order-last md:order-first">
              <ROICalculator />
            </div>
            
            {/* Pricing Cards */}
            <div className="md:col-span-3 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Starter",
                  price: billingCycle === 'monthly' ? 19 : 15,
                  icon: ArrowRight,
                  popular: false,
                  features: [
                    "Automated bid optimization",
                    "Up to five campaigns",
                    "Daily performance reports"
                  ]
                },
                {
                  name: "Professional",
                  price: billingCycle === 'monthly' ? 49 : 39,
                  icon: User,
                  popular: true,
                  features: [
                    "Unlimited campaign management",
                    "Advanced keyword analysis",
                    "Real-time bid adjustments",
                    "Priority email support"
                  ]
                },
                {
                  name: "Enterprise",
                  price: billingCycle === 'monthly' ? 99 : 79,
                  icon: Briefcase,
                  popular: false,
                  features: [
                    "White-label dashboard access",
                    "Custom integration support",
                    "Dedicated account manager",
                    "API access included",
                    "Phone and email support"
                  ]
                }
              ].map((plan, i) => (
                <Card key={i} className={cn(
                  "p-6 flex flex-col relative",
                  plan.popular && "border-primary shadow-lg ring-1 ring-primary/20"
                )}>
                  {/* Most Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        <Crown className="h-3 w-3" /> Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">{plan.name}</h3>
                    <plan.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-display font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{billingCycle === 'monthly' ? 'mo' : 'mo'}</span>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">Save 20%</p>
                    )}
                  </div>
                  <div className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Includes</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto">
                    <Link to="/auth">
                      <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                        Start free
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="min-h-[100dvh] md:min-h-0 md:py-20 lg:py-28 py-12 relative border-t border-border flex items-center snap-start">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Ready to cut the waste?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">Try free</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">Schedule demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="min-h-[100dvh] md:min-h-0 md:py-20 lg:py-28 py-12 relative overflow-hidden flex items-center snap-start">
        {/* Section background */}
        <div className="absolute inset-0 bg-muted/40" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header with badge */}
          <div className="mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Answers to the questions sellers ask most.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 lg:gap-y-10">
            {[
              {
                q: "Does PPC Pal work with all Amazon categories?",
                a: "Yes. PPC Pal integrates with every Amazon seller category and marketplace region. Whether you sell electronics, supplements, or home goods, the automation works the same way."
              },
              {
                q: "How quickly will I see results?",
                a: "Most sellers notice improved metrics within the first week. Bid optimization starts immediately, and keyword analysis runs continuously. Real savings typically appear within two to four weeks."
              },
              {
                q: "Can I pause or adjust the automation?",
                a: "Absolutely. You control everything. Set spending limits, pause campaigns, or adjust optimization aggressiveness anytime. The tool works for you, not against you."
              },
              {
                q: "What if I have multiple seller accounts?",
                a: "Professional and Enterprise plans support unlimited accounts. Manage them all from one dashboard. Starter plan handles one account, but you can upgrade anytime."
              },
              {
                q: "Is my data secure with PPC Pal?",
                a: "Your data is encrypted and stored securely. We never access your inventory or customer information. We only read campaign performance data needed for optimization."
              },
              {
                q: "Do you offer customer support?",
                a: "Yes. Starter and Professional plans get email support. Enterprise customers get a dedicated account manager and phone support. Response times are fast because we understand your business moves quickly."
              }
            ].map((faq, i) => (
              <div key={i}>
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 lg:mt-16 pt-12 lg:pt-16 border-t border-border">
            <h3 className="text-2xl font-display font-bold mb-2">Need more help?</h3>
            <p className="text-muted-foreground mb-6">Our team is ready to answer anything else.</p>
            <Link to="/contact">
              <Button variant="outline">Contact us</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 snap-start">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display font-semibold">PPC Pal</div>
                <div className="text-xs text-muted-foreground">AI-Powered PPC Optimization</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            
            <div className="text-sm text-muted-foreground text-center md:text-right">
              <div>© 2024 WISH AND WILLOW LTD</div>
              <div className="text-xs">All rights reserved</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
