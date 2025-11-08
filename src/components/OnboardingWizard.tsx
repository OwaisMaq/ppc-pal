import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, CheckCircle, Target, TrendingUp, Sparkles } from "lucide-react";
import { AmazonOAuthSetup } from "./AmazonOAuthSetup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const totalSteps = 4;

  const progress = (currentStep / totalSteps) * 100;

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          });
      }
      
      toast({
        title: "Welcome to PPC Pal!",
        description: "You're all set up and ready to optimize your campaigns.",
      });
      
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      onComplete();
      navigate('/dashboard');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                <Bot className="h-8 w-8 text-brand" />
              </div>
              <CardTitle className="text-2xl">Welcome to PPC Pal!</CardTitle>
              <CardDescription className="text-base">
                Your AI-powered Amazon PPC optimization platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-brand mt-0.5" />
                  <div>
                    <h4 className="font-medium">Smart Campaign Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor and optimize all your campaigns in one place
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-brand mt-0.5" />
                  <div>
                    <h4 className="font-medium">AI-Powered Insights</h4>
                    <p className="text-sm text-muted-foreground">
                      Get intelligent recommendations to reduce waste and increase sales
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-brand mt-0.5" />
                  <div>
                    <h4 className="font-medium">Automated Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Let AI handle bid adjustments, negatives, and budget pacing
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
              <AmazonOAuthSetup onConnectionSuccess={() => setCurrentStep(3)} />
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> We use Amazon's official OAuth to securely access your advertising data. 
                  We never see your Amazon password and you can revoke access anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Key Features Overview</CardTitle>
              <CardDescription className="text-base">
                Here's what you can do with PPC Pal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time KPIs, charts, and performance metrics
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Search Terms & Keywords</h4>
                    <p className="text-sm text-muted-foreground">
                      AI identifies waste and opportunities at the keyword level
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Budget Copilot</h4>
                    <p className="text-sm text-muted-foreground">
                      Smart budget recommendations based on performance and pacing
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Anomaly Detection</h4>
                    <p className="text-sm text-muted-foreground">
                      Get alerts when metrics spike or dip unexpectedly
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="border-none shadow-none">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">You're All Set!</CardTitle>
              <CardDescription className="text-base">
                Ready to start optimizing your Amazon PPC campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">What happens next?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-brand">•</span>
                    <span>Your campaign data will begin syncing (this may take a few minutes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand">•</span>
                    <span>AI will analyze your campaigns and generate insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand">•</span>
                    <span>You'll start seeing recommendations within 24 hours</span>
                  </li>
                </ul>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Need help? Visit our <a href="https://docs.lovable.dev" className="text-brand hover:underline">documentation</a> or contact support.
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

          {currentStep === 3 && (
            <Button
              className="ml-auto"
              onClick={() => setCurrentStep(4)}
            >
              Continue
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

          {currentStep < 4 && (
            <Button
              variant="ghost"
              onClick={handleComplete}
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
