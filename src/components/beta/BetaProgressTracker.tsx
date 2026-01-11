import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BetaSetupItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  link?: string;
}

interface BetaProgressTrackerProps {
  items: BetaSetupItem[];
  loading?: boolean;
}

export const BetaProgressTracker = ({ items, loading }: BetaProgressTrackerProps) => {
  const completedCount = items.filter(item => item.completed).length;
  const progressPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const allComplete = completedCount === items.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Setup Progress</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {items.length} complete
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                item.completed 
                  ? "bg-success/5 border-success/20" 
                  : "bg-background border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                item.completed ? "bg-success text-success-foreground" : "border-2 border-muted-foreground/30"
              )}>
                {item.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground/30" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  item.completed && "text-muted-foreground"
                )}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              
              {!item.completed && item.link && (
                <Link 
                  to={item.link}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
        
        {allComplete && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm text-success font-medium">
              Setup complete! You're ready to start optimizing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
