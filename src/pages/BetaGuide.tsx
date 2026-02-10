import { useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import { 
  BetaWelcomeBanner, 
  BetaProgressTracker, 
  QuickWinsChecklist, 
  BetaExpectations,
  type BetaSetupItem
} from "@/components/beta";
import FeedbackForm from "@/components/FeedbackForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { useAutomationRules } from "@/hooks/useAutomation";
import { MessageSquare } from "lucide-react";

const BetaGuide = () => {
  const { connections, activeConnection } = useGlobalFilters();
  const hasConnections = connections.length > 0;
  const profileId = activeConnection?.profile_id;
  
  const { rules, loading: rulesLoading } = useAutomationRules(profileId);
  
  // Generate setup items based on actual state
  const setupItems: BetaSetupItem[] = useMemo(() => {
    const hasEnabledRules = (rules?.filter(r => r.enabled).length || 0) > 0;
    const hasHistoricalData = activeConnection?.last_sync_at !== null;
    
    return [
      {
        id: 'account',
        label: 'Create your account',
        description: 'Sign up and verify your email',
        completed: true, // They're on this page, so account exists
      },
      {
        id: 'amazon',
        label: 'Connect Amazon Ads account',
        description: 'Link your Amazon Advertising account via OAuth',
        completed: hasConnections,
        link: '/settings?tab=connections'
      },
      {
        id: 'sync',
        label: 'Complete initial data sync',
        description: 'Wait for your campaign data to import',
        completed: hasHistoricalData,
        link: '/settings?tab=data'
      },
      {
        id: 'rule',
        label: 'Enable your first automation rule',
        description: 'Set up automated optimizations',
        completed: hasEnabledRules,
        link: '/governance'
      },
      {
        id: 'explore',
        label: 'Review search term analysis',
        description: 'Explore your top performing and wasted spend keywords',
        completed: false, // Could track this via local storage or DB
        link: '/campaigns?view=search-terms'
      }
    ];
  }, [hasConnections, activeConnection, rules]);

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4 space-y-8 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Beta Guide</h1>
          <p className="text-muted-foreground mt-1">
            Your guide to getting started with PPC Pal
          </p>
        </div>

        {/* Welcome Banner */}
        <BetaWelcomeBanner />

        {/* Progress Tracker */}
        <BetaProgressTracker items={setupItems} loading={rulesLoading} />

        {/* Quick Wins */}
        <QuickWinsChecklist />

        {/* Feature Status & Limitations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">What to Expect</h2>
          <BetaExpectations />
        </div>

        {/* Feedback Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Need Help?</CardTitle>
                <CardDescription>
                  Visit our <a href="/help" className="text-primary hover:underline">Help & Support</a> page for FAQs, glossary, and getting started guide.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Share Your Feedback</CardTitle>
                <CardDescription>
                  Your input is invaluable during the beta period
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FeedbackForm />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default BetaGuide;
