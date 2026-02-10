import DashboardShell from "@/components/DashboardShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const glossary = [
  { term: "ACoS", definition: "Advertising Cost of Sales — your ad spend divided by ad revenue. Lower is better." },
  { term: "ROAS", definition: "Return on Ad Spend — ad revenue divided by ad spend. Higher is better. The inverse of ACoS." },
  { term: "TACoS", definition: "Total Advertising Cost of Sales — ad spend divided by total revenue (organic + ad). Shows how ads impact your overall business." },
  { term: "CPC", definition: "Cost Per Click — the average amount you pay each time someone clicks your ad." },
  { term: "CTR", definition: "Click-Through Rate — the percentage of impressions that result in a click." },
  { term: "CVR", definition: "Conversion Rate — the percentage of clicks that result in a sale." },
  { term: "Impressions", definition: "The number of times your ad was shown to shoppers." },
  { term: "Negative Keyword", definition: "A keyword you add to prevent your ad from showing for irrelevant searches, reducing wasted spend." },
  { term: "Search Term", definition: "The actual phrase a customer typed that triggered your ad. Different from the keyword you're targeting." },
  { term: "Bid", definition: "The maximum amount you're willing to pay for a click on your ad." },
  { term: "Dayparting", definition: "Adjusting bids or pausing campaigns during specific hours of the day based on performance patterns." },
];

const faqs = [
  {
    q: "How long does the initial data sync take?",
    a: "Usually 5–15 minutes for campaigns, ad groups, and keywords. Historical performance data (up to 12 months) may take longer depending on account size. You'll see progress in your Command Center.",
  },
  {
    q: "Is my Amazon data secure?",
    a: "Yes. We use OAuth 2.0 to connect — we never see or store your Amazon password. API tokens are encrypted at rest, and data is isolated per user with Row Level Security.",
  },
  {
    q: "What does PPC Pal do automatically?",
    a: "Only what you enable. Automation rules must be turned on in Governance, and can run in 'suggest' mode (you approve each action) or 'auto-apply' mode. You can revert any action.",
  },
  {
    q: "How are savings calculated?",
    a: "Savings are estimated based on actions taken: wasted clicks blocked by negative keywords, spend saved by pausing underperformers, and bid reductions. These are conservative estimates.",
  },
  {
    q: "What happens if my Amazon token expires?",
    a: "Tokens are automatically refreshed every 30 minutes. If a refresh fails, you'll see a warning in your Command Center. You can reconnect from Settings > Connections.",
  },
  {
    q: "Can I undo an automated action?",
    a: "Yes. Every action PPC Pal takes is logged with before/after state. You can revert any action from the Activity feed in your Command Center.",
  },
  {
    q: "Which Amazon marketplaces are supported?",
    a: "PPC Pal supports all Amazon Advertising API marketplaces including US, UK, DE, FR, IT, ES, CA, AU, JP, and more.",
  },
  {
    q: "How do I get the Weekly Profit Pulse?",
    a: "Go to Settings > Notifications and set your digest frequency to 'Weekly'. You can receive it via Slack webhook or email.",
  },
];

const Help = () => {
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4 space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
          <p className="text-muted-foreground mt-1">Everything you need to get started with PPC Pal</p>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">1</Badge>
                <div><span className="font-medium">Create your account</span> — Sign up and verify your email address.</div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">2</Badge>
                <div><span className="font-medium">Connect Amazon Ads</span> — Link your Amazon Advertising account via OAuth in <Link to="/settings?tab=connections" className="text-primary hover:underline">Settings</Link>.</div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">3</Badge>
                <div><span className="font-medium">Wait for initial sync</span> — Your campaigns, keywords, and performance data will be imported automatically (5–15 minutes).</div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">4</Badge>
                <div><span className="font-medium">Enable automation rules</span> — Go to <Link to="/governance" className="text-primary hover:underline">Governance</Link> to enable rules. Start with "suggest" mode to review actions before they're applied.</div>
              </li>
              <li className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">5</Badge>
                <div><span className="font-medium">Set up notifications</span> — Configure Slack or email in <Link to="/settings?tab=notifications" className="text-primary hover:underline">Settings</Link> to receive your Weekly Profit Pulse.</div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              PPC Glossary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {glossary.map((item) => (
                <div key={item.term} className="p-3 rounded-lg border bg-muted/30">
                  <p className="font-medium text-sm">{item.term}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.definition}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Need More Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Can't find what you're looking for? We're here to help during the beta.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link to="/feedback">Submit Feedback</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default Help;
