import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { 
  CheckCircle2, 
  Circle, 
  Rocket, 
  Link2, 
  Bot, 
  Target,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupItem {
  id: string;
  label: string;
  completed: boolean;
  link: string;
  icon: React.ElementType;
}

interface OnboardingGuidanceCardProps {
  items: SetupItem[];
  automationExplainer?: string;
  loading?: boolean;
}

export const OnboardingGuidanceCard = ({ 
  items, 
  automationExplainer,
  loading 
}: OnboardingGuidanceCardProps) => {
  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const isComplete = completedCount === items.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if setup is complete and no explainer
  if (isComplete && !automationExplainer) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          {isComplete ? "What PPC Pal is Doing" : "Setup Progress"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isComplete && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completedCount}/{items.length} complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                      item.completed 
                        ? "bg-success/5 border-success/20 hover:bg-success/10" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={cn(
                      "flex-1 text-sm",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {automationExplainer && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">What PPC Pal is Doing</p>
                <p className="text-sm text-muted-foreground">
                  {automationExplainer}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Default setup items helper
export const getDefaultSetupItems = (config: {
  hasConnection: boolean;
  hasRules: boolean;
  hasTarget: boolean;
  hasHistoricalData: boolean;
}): SetupItem[] => [
  {
    id: 'connect',
    label: 'Connect Amazon Advertising account',
    completed: config.hasConnection,
    link: '/settings',
    icon: Link2
  },
  {
    id: 'target',
    label: 'Set your target ACoS',
    completed: config.hasTarget,
    link: '/settings',
    icon: Target
  },
  {
    id: 'rules',
    label: 'Enable automation rules',
    completed: config.hasRules,
    link: '/automate',
    icon: Bot
  },
  {
    id: 'data',
    label: 'Import historical data',
    completed: config.hasHistoricalData,
    link: '/settings',
    icon: Rocket
  }
];