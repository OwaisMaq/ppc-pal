import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, BarChart3, Target, ClipboardCheck, ShoppingCart, Building2, Users } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "Search Term Analytics",
    description:
      "Identify which keywords drive profitable sales and which drain your budget. We surface wasted spend from irrelevant search terms, highlight high-converting queries you're missing, and give you actionable negative keyword recommendations to tighten targeting across every campaign.",
  },
  {
    icon: BarChart3,
    title: "Campaign Performance Reporting",
    description:
      "Track ACoS, ROAS, spend, and sales trends over time with clear, digestible dashboards. Spot underperforming campaigns early, compare period-over-period results, and understand exactly where your advertising budget delivers returns — and where it doesn't.",
  },
  {
    icon: Target,
    title: "Bid Optimisation Insights",
    description:
      "Receive data-backed bid recommendations powered by Bayesian modelling. We analyse historical click, conversion, and spend data at the keyword level to suggest optimal bids that balance profitability with visibility — no guesswork, no wasted impressions.",
  },
  {
    icon: ClipboardCheck,
    title: "Advertising Audit",
    description:
      "Get a comprehensive health check of your entire Amazon advertising account. We evaluate campaign structure, targeting overlap, budget allocation, match-type distribution, and wasted spend to produce an actionable report card with prioritised recommendations.",
  },
];

const audiences = [
  {
    icon: ShoppingCart,
    title: "FBA & FBM Sellers",
    description:
      "Whether you fulfil through Amazon or handle logistics yourself, PPC Pal helps you stretch every advertising pound further. Reduce wasted spend, improve keyword targeting, and scale profitably without hiring a PPC specialist.",
  },
  {
    icon: Building2,
    title: "Brand Owners",
    description:
      "Protect your brand keywords, monitor competitor activity, and ensure your Sponsored Products and Sponsored Brands campaigns work together. Get the visibility you need to make confident, data-driven advertising decisions.",
  },
  {
    icon: Users,
    title: "Agencies & Consultants",
    description:
      "Manage multiple Amazon ad accounts from a single platform. Deliver professional reporting, automate routine optimisations, and demonstrate clear ROI to your clients with transparent performance dashboards.",
  },
];

const Solutions = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/ppcpal-logo.jpg" alt="PPC Pal" className="h-8" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <a href="https://blog.ppcpal.online" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/waitlist">
              <Button size="sm">Get Early Access</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6">
            Amazon Advertising Analytics &amp; Optimisation for Sellers
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-4">
            Analyse your PPC performance, uncover wasted spend, and make data-driven bid decisions — all from one platform built specifically for Amazon advertisers.
          </p>
          <p className="text-base text-muted-foreground/80 mb-10">
            No spreadsheets. No guesswork. Just clear insights that help you spend less and sell more.
          </p>
          <Link to="/waitlist">
            <Button size="xl" className="rounded-full px-8">
              Request Early Access
            </Button>
          </Link>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What We Offer</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four core capabilities designed to give Amazon sellers complete visibility and control over their advertising spend.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {services.map((s) => (
              <Card key={s.title} className="flex flex-col">
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 mb-4">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Who It's For</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              PPC Pal is built for anyone spending money on Amazon advertising and wanting better results.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {audiences.map((a) => (
              <div key={a.title} className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                  <a.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Ready to stop wasting ad spend?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join the private beta and get early access to smarter Amazon advertising analytics. Limited spots available.
          </p>
          <Link to="/waitlist">
            <Button size="xl" className="rounded-full px-8">
              Request Early Access
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-medium">WISH AND WILLOW LTD</span>
          <div className="flex items-center gap-6">
            <a href="mailto:info@ppcpal.online" className="hover:text-foreground transition-colors">info@ppcpal.online</a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Solutions;
