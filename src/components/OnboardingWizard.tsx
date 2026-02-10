import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle, Target, TrendingUp, Sparkles, Database, Loader2 } from "lucide-react";
import AmazonOAuthSetup from "./AmazonOAuthSetup";
import GoalSelector, { OptimizationGoal } from "./onboarding/GoalSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { track } from "@/lib/analytics";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<OptimizationGoal | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connections } = useAmazonConnections();
  const totalSteps = 4;
  
  // First-insight data
  const [firstInsight, setFirstInsight] = useState<{ campaigns: number; spend: number } | null>(null);
  
  // Import progress state
  const [importStatus, setImportStatus] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    total: 0,
    isImporting: false,
  });

  // Track step views
  useEffect(() => {
    track("onboarding_step_viewed", { step: currentStep, totalSteps });
  }, [currentStep]);

  // Poll for import progress when on step 4 (final)
  useEffect(() => {
    if (currentStep !== 4 || connections.length === 0) return;

    const connectionId = connections[0]?.id;
    const profileId = connections[0]?.profile_id;
    if (!connectionId) return;

    const fetchImportStatus = async () => {
      const { data: reports } = await supabase
        .from('pending_amazon_reports')
        .select('status')
        .eq('connection_id', connectionId);

      if (!reports) return;

      const counts = {
        pending: reports.filter(r => r.status === 'pending').length,
        processing: reports.filter(r => r.status === 'processing').length,
        completed: reports.filter(r => r.status === 'completed').length,
        total: reports.length,
        isImporting: reports.some(r => r.status === 'pending' || r.status === 'processing'),
      };

      setImportStatus(counts);
    };

    // Fetch first-insight data
    const fetchFirstInsight = async () => {
      if (!profileId) return;
      try {
        const result = await (supabase.from('campaigns') as any)
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId);
        
        const campaignCount: number = result?.count || 0;

        if (campaignCount > 0) {
          const { data: perf } = await (supabase
            .from('campaign_performance_history') as any)
            .select('spend')
            .eq('profile_id', profileId)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

          const totalSpend = perf?.reduce((s: any, r: any) => s + (r.spend || 0), 0) || 0;
          setFirstInsight({ campaigns: campaignCount, spend: totalSpend });
        }
      } catch {
        // Silently fail — this is a nice-to-have
      }
    };

    fetchImportStatus();
    fetchFirstInsight();
    const interval = setInterval(() => {
      fetchImportStatus();
      fetchFirstInsight();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentStep, connections]);

  const progress = (currentStep / totalSteps) * 100;

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
        
        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
      }

      track("onboarding_completed", { goal: selectedGoal, step: currentStep });
      
      toast({
        title: "Welcome to PPC Pal!",
        description: selectedGoal 
          ? `We've configured your account for "${selectedGoal.replace('_', ' ')}" optimization.`
          : "You're all set up and ready to optimize your campaigns.",
      });
      
      onComplete();
      navigate('/command-center');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    track("onboarding_skipped", { step: currentStep });
    handleComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to PPC Pal!</CardTitle>
              <CardDescription className="text-base">
                Your intelligent Amazon PPC optimization platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Smart Campaign Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor and optimize all your campaigns in one place
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Data-Driven Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Get intelligent recommendations to reduce waste and increase sales
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Rule-Based Automation</h4>
                    <p className="text-sm text-muted-foreground">
                      Automated bid adjustments, negatives, and budget pacing based on proven logic
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Connect Your Amazon Account</CardTitle>
              <CardDescription className="text-base">
                Securely connect to start optimizing your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AmazonOAuthSetup />
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Once you've connected your account, click continue to proceed.
                </p>
                <Button onClick={() => setCurrentStep(3)}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <GoalSelector
            selectedGoal={selectedGoal}
            onGoalSelect={setSelectedGoal}
            onContinue={() => setCurrentStep(4)}
            showContinue={true}
          />
        );

      case 4:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {importStatus.isImporting ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {importStatus.isImporting ? "Syncing Your Data..." : "You're All Set!"}
              </CardTitle>
              <CardDescription className="text-base">
                {importStatus.isImporting
                  ? "We're importing your campaign data. This usually takes 5–15 minutes."
                  : "Ready to start optimizing your Amazon PPC campaigns"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Import Progress Section */}
              {importStatus.total > 0 && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2">
                    {importStatus.isImporting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <h4 className="font-medium">Importing historical data...</h4>
                      </>
                    ) : (
                      <>
                        <Database className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Historical data import complete!</h4>
                      </>
                    )}
                  </div>
                  
                  <Progress 
                    value={importStatus.total > 0 ? ((importStatus.completed) / importStatus.total) * 100 : 0} 
                    className="h-2" 
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{importStatus.completed} of {importStatus.total} reports processed</span>
                    {importStatus.isImporting && (
                      <span>{importStatus.pending + importStatus.processing} remaining</span>
                    )}
                  </div>
                </div>
              )}

              {/* First Insight Teaser */}
              {firstInsight && firstInsight.campaigns > 0 && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">First Look</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We found <span className="font-semibold text-foreground">{firstInsight.campaigns} campaigns</span>
                    {firstInsight.spend > 0 && (
                      <> spending <span className="font-semibold text-foreground">£{firstInsight.spend.toFixed(0)}</span> last week</>
                    )}. Your insights will start appearing shortly.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">What happens next?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {importStatus.isImporting 
                        ? "Your historical data is being imported (up to 12 months)"
                        : "Your campaign data will begin syncing (this may take a few minutes)"
                      }
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Our rules engine will analyze your campaigns and identify opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>You'll start seeing recommendations within 24 hours</span>
                  </li>
                </ul>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Need help? Visit our <a href="/help" className="text-primary hover:underline">Help & Support</a> page or contact support.
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {renderStep()}

        <div className="flex justify-between gap-4">
          {currentStep > 1 && currentStep < 4 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button
              className="ml-auto"
              onClick={() => setCurrentStep(2)}
            >
              Get Started
            </Button>
          )}

          {currentStep === 4 && (
            <Button
              className="ml-auto"
              onClick={handleComplete}
            >
              Go to Dashboard
            </Button>
          )}

          {currentStep < 4 && currentStep !== 3 && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="ml-auto"
            >
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
