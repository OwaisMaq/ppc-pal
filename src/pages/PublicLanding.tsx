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
  User
} from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
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
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
                Stop wasting money on Amazon ads
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                PPC Pal automates your campaign optimization. Let your bids work smarter while you focus on growing your business.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="gap-2">
                    Start <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg">
                    Learn
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Hero Image - Dashboard Preview */}
            <div className="relative">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-muted-foreground mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              What makes us different
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real tools for real sellers who want real results.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Automation Card */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Automation</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Intelligent bid optimization that never sleeps
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Your bids adjust automatically based on performance data. No more manual tweaking at midnight.
                </p>
              </div>
              <AutomationPreview />
            </div>
            
            {/* Keywords Card */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Keywords</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Smart keyword management
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Identify winners and eliminate losers before they drain your budget.
                </p>
              </div>
              <KeywordsPreview />
            </div>
            
            {/* Analytics Card */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Analytics</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Clear performance insights
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  See exactly where your money goes and what it brings back.
                </p>
              </div>
              <AnalyticsPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-muted-foreground mb-3">Results</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Why sellers choose PPC Pal
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The numbers speak for themselves when waste disappears.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Savings */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Savings</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Cut ad spend without cutting sales
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reduce wasted clicks and improve your cost per acquisition immediately.
                </p>
              </div>
              <SavingsPreview />
            </div>
            
            {/* Returns - reuse Analytics for ROI view */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Returns</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Better ROI from day one
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every dollar works harder when optimization runs continuously.
                </p>
              </div>
              <AnalyticsPreview />
            </div>
            
            {/* Time - show automation working overnight */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Time</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Get your hours back
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stop managing campaigns manually and start managing your business.
                </p>
              </div>
              <OptimizePreview />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-muted-foreground mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to smarter campaign management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Connect */}
            <div className="space-y-4">
              <ConnectPreview />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Step 1: Connect</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Link your Amazon seller account
                </h3>
                <p className="text-sm text-muted-foreground">
                  PPC Pal connects directly to your campaigns in minutes.
                </p>
              </div>
            </div>
            
            {/* Analyze */}
            <div className="space-y-4">
              <AnalyzePreview />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Step 2: Analyze</p>
                <h3 className="text-xl font-display font-semibold mb-2">
                  Watch the data flow in real time
                </h3>
                <p className="text-sm text-muted-foreground">
                  Performance metrics arrive instantly so you see what matters.
                </p>
              </div>
            </div>
            
            {/* Optimize */}
            <div className="space-y-4">
              <OptimizePreview />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Step 3: Optimize</p>
                <h3 className="text-xl font-display font-semibold mb-2">
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
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Real sellers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sellers trust PPC Pal with their budgets.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
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
      <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-muted-foreground mb-3">Plans</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Simple pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
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
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Ready to cut the waste?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth">
              <Button size="lg">Try free</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg">Schedule demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">FAQ</h2>
            <p className="text-muted-foreground">Answers to the questions sellers ask most.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-x-12 gap-y-10">
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
          
          <div className="mt-16 pt-16 border-t border-border">
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
