import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  TrendingDown, 
  Bell, 
  Target,
  ArrowRight
} from "lucide-react";

interface QuickWin {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ElementType;
  priority: 'high' | 'medium' | 'low';
}

const quickWins: QuickWin[] = [
  {
    id: 'review-negatives',
    title: 'Review top wasted spend keywords',
    description: 'Identify search terms draining budget without converting',
    link: '/campaigns?view=search-terms',
    icon: Search,
    priority: 'high'
  },
  {
    id: 'setup-rule',
    title: 'Create your first automation rule',
    description: 'Set up automatic negative keyword addition for high-spend, no-sale terms',
    link: '/governance',
    icon: Target,
    priority: 'high'
  },
  {
    id: 'configure-alerts',
    title: 'Configure ACoS alerts',
    description: 'Get notified when campaigns exceed your target ACoS',
    link: '/settings?tab=notifications',
    icon: Bell,
    priority: 'medium'
  },
  {
    id: 'review-underperformers',
    title: 'Pause underperforming targets',
    description: 'Review and pause keywords with high spend and no conversions',
    link: '/campaigns',
    icon: TrendingDown,
    priority: 'medium'
  }
];

export const QuickWinsChecklist = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Wins</CardTitle>
        <CardDescription>
          Actionable first steps to start improving your campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quickWins.map((win) => (
            <div
              key={win.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <win.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{win.title}</p>
                  {win.priority === 'high' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {win.description}
                </p>
              </div>
              
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link to={win.link}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
