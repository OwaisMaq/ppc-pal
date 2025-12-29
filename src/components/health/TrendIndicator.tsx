import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  trend: "up" | "down" | "stable" | "new";
  scoreDiff?: number;
  compact?: boolean;
}

export function TrendIndicator({ trend, scoreDiff, compact = false }: TrendIndicatorProps) {
  const config = {
    up: {
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      label: scoreDiff !== undefined ? `+${scoreDiff} vs last month` : "Improving",
    },
    down: {
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: scoreDiff !== undefined ? `${scoreDiff} vs last month` : "Declining",
    },
    stable: {
      icon: Minus,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Stable",
    },
    new: {
      icon: Sparkles,
      color: "text-primary",
      bgColor: "bg-primary/10",
      label: "First audit",
    },
  };

  const { icon: Icon, color, bgColor, label } = config[trend];

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", bgColor)}>
        <Icon className={cn("h-3 w-3", color)} />
        <span className={cn("text-xs font-medium", color)}>
          {trend === "up" && scoreDiff !== undefined && `+${scoreDiff}`}
          {trend === "down" && scoreDiff !== undefined && scoreDiff}
          {(trend === "stable" || trend === "new") && trend}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", bgColor)}>
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </div>
  );
}
