import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  Sparkles
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

const PublicLanding = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    document.title = "PPC Pal — Stop Wasting Money on Amazon Ads";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      {/* Hero Section */}
      <section className="py-20 lg:py-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              {/* Playful Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-sm font-medium text-amber-800 dark:text-amber-200 animate-fade-in">
                <span>👋</span> Bye-bye, messy spreadsheets
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
                Amazon Ads,{" "}
                <span className="relative inline-block">
                  Simplified.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C50 2 150 2 198 8" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" className="animate-[draw_1s_ease-out_forwards]" strokeDasharray="200" strokeDashoffset="200" style={{ animation: 'draw 1s ease-out 0.5s forwards' }}/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                We optimize your bids 24/7 so you can focus on growing your brand (or sleeping).
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 rounded-full px-8 shadow-lg hover:shadow-xl transition-shadow">
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features" className="group">
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
              
              {/* Social Proof */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[
                    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500"
                  ].map((color, i) => (
                    <div 
                      key={i}
                      className={`w-10 h-10 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-xs font-medium`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {['M', 'S', 'J', 'A'][i]}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                    +2k
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by <span className="font-semibold text-foreground">2,000+</span> sellers
                </p>
              </div>
            </div>
            
            {/* Hero Image - Dashboard Preview with Floating Cards */}
            <div className="relative">
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

      {/* Trusted By Section */}
      <section className="py-12 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-medium text-muted-foreground tracking-widest uppercase mb-8">
            Powering Top Brands Globally
          </p>
          <div className="flex items-center justify-center gap-16 md:gap-24">
            <div className="flex items-center justify-center h-16">
              <img 
                src={infiniteWorldLogo} 
                alt="Infinite World" 
                className="h-12 md:h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
              />
            </div>
            <div className="flex items-center justify-center h-16">
              <img 
                src={wishAndWillowLogo} 
                alt="Wish & Willow" 
                className="h-12 md:h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-20 lg:py-28 relative overflow-hidden">
        {/* Section background with subtle pattern */}
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.03),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header with badge */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              What makes us different
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Real tools for real sellers who want real results.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Automation Card */}
            <div className="flex flex-col space-y-4">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Automation</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Intelligent bid optimization that never sleeps
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Your bids adjust automatically based on performance data. No more manual tweaking at midnight.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <AutomationPreview />
              </div>
            </div>
            
            {/* Keywords Card */}
            <div className="flex flex-col space-y-4">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Keywords</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Smart keyword management
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Identify winners and eliminate losers before they drain your budget.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <KeywordsPreview />
              </div>
            </div>
            
            {/* Analytics Card */}
            <div className="flex flex-col space-y-4 sm:col-span-2 md:col-span-1">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Analytics</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Clear performance insights
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  See exactly where your money goes and what it brings back.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <AnalyticsPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 lg:py-28 relative border-t border-border">
        <div className="container mx-auto px-4">
          {/* Section header with badge */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 border border-success/20 mb-4">
              <span className="text-xs font-semibold text-success uppercase tracking-wider">Results</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Why sellers choose PPC Pal
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              The numbers speak for themselves when waste disappears.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Savings */}
            <div className="flex flex-col space-y-4">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-success mb-2 uppercase tracking-wide">Savings</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Cut ad spend without cutting sales
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reduce wasted clicks and improve your cost per acquisition immediately.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <SavingsPreview />
              </div>
            </div>
            
            {/* Returns */}
            <div className="flex flex-col space-y-4">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-success mb-2 uppercase tracking-wide">Returns</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Better ROI from day one
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every dollar works harder when optimization runs continuously.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <AnalyticsPreview />
              </div>
            </div>
            
            {/* Time */}
            <div className="flex flex-col space-y-4 sm:col-span-2 md:col-span-1">
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-success mb-2 uppercase tracking-wide">Time</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Get your hours back
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stop managing campaigns manually and start managing your business.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <OptimizePreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        {/* Section background */}
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 relative">
          {/* Section header with badge */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Three simple steps to smarter campaign management.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Connect */}
            <div className="flex flex-col space-y-4">
              <div className="flex-1 min-h-0">
                <ConnectPreview />
              </div>
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Step 1: Connect</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Link your Amazon seller account
                </h3>
                <p className="text-sm text-muted-foreground">
                  PPC Pal connects directly to your campaigns in minutes.
                </p>
              </div>
            </div>
            
            {/* Analyze */}
            <div className="flex flex-col space-y-4">
              <div className="flex-1 min-h-0">
                <AnalyzePreview />
              </div>
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Step 2: Analyze</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Watch the data flow in real time
                </h3>
                <p className="text-sm text-muted-foreground">
                  Performance metrics arrive instantly so you see what matters.
                </p>
              </div>
            </div>
            
            {/* Optimize */}
            <div className="flex flex-col space-y-4 sm:col-span-2 md:col-span-1">
              <div className="flex-1 min-h-0">
                <OptimizePreview />
              </div>
              <div className="flex-shrink-0">
                <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Step 3: Optimize</p>
                <h3 className="text-lg lg:text-xl font-display font-semibold mb-2">
                  Let automation handle the heavy lifting
                </h3>
                <p className="text-sm text-muted-foreground">
                  Bids adjust, keywords shift, waste disappears while you sleep.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-28 relative border-t border-border">
        <div className="container mx-auto px-4">
          {/* Section header with badge */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/10 border border-warning/20 mb-4">
              <span className="text-xs font-semibold text-warning uppercase tracking-wider">Testimonials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Real sellers
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Sellers trust PPC Pal with their budgets.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                stars: 4,
                quote: "I stopped losing money the moment I started using PPC Pal. My campaigns run better without me.",
                name: "Marcus Chen",
                role: "Amazon seller, electronics"
              },
              {
                stars: 5,
                quote: "The time I saved alone paid for the subscription. The money I saved paid for everything else.",
                name: "Sarah Williams",
                role: "Amazon seller, home goods"
              },
              {
                stars: 5,
                quote: "Finally, a tool that actually understands what sellers need. No fluff, just results.",
                name: "James Rodriguez",
                role: "Amazon seller, supplements"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star 
                      key={j} 
                      className={cn(
                        "h-4 w-4",
                        j < testimonial.stars ? "fill-foreground text-foreground" : "text-muted-foreground"
                      )} 
                    />
                  ))}
                </div>
                <p className="text-sm mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28 relative overflow-hidden">
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
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: billingCycle === 'monthly' ? 19 : 15,
                icon: ArrowRight,
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
                features: [
                  "White-label dashboard access",
                  "Custom integration support",
                  "Dedicated account manager",
                  "API access included",
                  "Phone and email support"
                ]
              }
            ].map((plan, i) => (
              <Card key={i} className="p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">{plan.name}</h3>
                  <plan.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{billingCycle === 'monthly' ? 'mo' : 'mo'}</span>
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
                    <Button className="w-full" variant={i === 1 ? "default" : "outline"}>
                      Start free
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 relative border-t border-border">
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
      <section id="faq" className="py-20 lg:py-28 relative overflow-hidden">
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
      <footer className="border-t border-border py-12">
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
