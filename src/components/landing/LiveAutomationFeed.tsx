import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Ban, Target, DollarSign, Zap } from "lucide-react";

interface AutomationAction {
  id: number;
  icon: typeof TrendingDown;
  iconColor: string;
  bgColor: string;
  action: string;
  detail: string;
  time: string;
}

const automationActions: AutomationAction[] = [
  {
    id: 1,
    icon: TrendingDown,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    action: "Reduced bid",
    detail: "'organic dog treats' - ACoS too high",
    time: "2s ago"
  },
  {
    id: 2,
    icon: Ban,
    iconColor: "text-destructive",
    bgColor: "bg-destructive/10",
    action: "Added negative",
    detail: "'free sample' - zero conversions",
    time: "15s ago"
  },
  {
    id: 3,
    icon: TrendingUp,
    iconColor: "text-primary",
    bgColor: "bg-primary/10",
    action: "Increased budget",
    detail: "Summer Sale Campaign +15%",
    time: "1m ago"
  },
  {
    id: 4,
    icon: Target,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-500/10",
    action: "Paused target",
    detail: "'B0XXXYYY' - poor performance",
    time: "2m ago"
  },
  {
    id: 5,
    icon: DollarSign,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    action: "Optimized bid",
    detail: "'wireless charger' → $0.85",
    time: "3m ago"
  },
  {
    id: 6,
    icon: Zap,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-500/10",
    action: "Auto-scaled",
    detail: "High-ROAS campaign boosted",
    time: "5m ago"
  }
];

const LiveAutomationFeed = () => {
  const [visibleActions, setVisibleActions] = useState<AutomationAction[]>(automationActions.slice(0, 3));
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setVisibleActions(prev => {
          const currentFirstId = prev[0].id;
          const nextIndex = automationActions.findIndex(a => a.id === currentFirstId);
          const newFirstIndex = (nextIndex + 1) % automationActions.length;
          return [
            automationActions[newFirstIndex],
            automationActions[(newFirstIndex + 1) % automationActions.length],
            automationActions[(newFirstIndex + 2) % automationActions.length]
          ];
        });
        setIsAnimating(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">Live AI Actions</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">Updated in real-time</span>
      </div>
      <div className={cn(
        "divide-y divide-border transition-opacity duration-300",
        isAnimating && "opacity-50"
      )}>
        {visibleActions.map((action, i) => (
          <div 
            key={`${action.id}-${i}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", action.bgColor)}>
              <action.icon className={cn("h-4 w-4", action.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                <span className={action.iconColor}>{action.action}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-foreground/80">{action.detail}</span>
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{action.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveAutomationFeed;
