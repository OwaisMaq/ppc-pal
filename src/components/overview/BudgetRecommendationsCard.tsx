import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetCopilot, BudgetRecommendation } from "@/hooks/useBudgetCopilot";
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { Wallet, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_CONFIG = {
  increase: {
    icon: TrendingUp,
    label: 'Increase',
    badgeClass: 'bg-success/10 text-success border-success/20',
  },
  decrease: {
    icon: TrendingDown,
    label: 'Decrease',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  hold: {
    icon: Minus,
    label: 'Hold',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};

const formatBudget = (micros: number) => {
  return `£${(micros / 1_000_000).toFixed(2)}`;
};

interface BudgetRecommendationItemProps {
  rec: BudgetRecommendation;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

const BudgetRecommendationItem = ({ rec, onApply, onDismiss }: BudgetRecommendationItemProps) => {
  const config = ACTION_CONFIG[rec.action];
  const Icon = config.icon;

  return (
    <div className="p-4 border border-border rounded-lg bg-card space-y-3 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={cn("shrink-0", config.badgeClass)}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <span className="text-sm font-medium truncate">
            Campaign {rec.campaign_id.slice(0, 8)}...
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Current Budget</p>
          <p className="font-medium">{formatBudget(rec.current_budget_micros)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Suggested</p>
          <p className="font-medium text-primary">
            {rec.suggested_budget_micros ? formatBudget(rec.suggested_budget_micros) : '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Pace Ratio</p>
          <p className={cn(
            "font-medium",
            rec.pace_ratio > 1.25 ? "text-warning" : 
            rec.pace_ratio < 0.75 ? "text-info" : "text-success"
          )}>
            {rec.pace_ratio.toFixed(2)}x
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Forecast EOD</p>
          <p className="font-medium">{formatBudget(rec.forecast_eod_spend_micros)}</p>
        </div>
      </div>

      {rec.reason && (
        <p className="text-xs text-muted-foreground">{rec.reason}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDismiss(rec.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </Button>
        <Button 
          size="sm" 
          onClick={() => onApply(rec.id)}
          disabled={!rec.suggested_budget_micros}
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

export const BudgetRecommendationsCard = () => {
  const { connections } = useGlobalFilters();
  const { 
    recommendations, 
    loading, 
    fetchRecommendations, 
    applyRecommendation, 
    dismissRecommendation 
  } = useBudgetCopilot();

  useEffect(() => {
    if (connections.length > 0) {
      fetchRecommendations();
    }
  }, [connections, fetchRecommendations]);

  const openRecommendations = recommendations.filter(r => r.state === 'open');
  const count = openRecommendations.length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Budget Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (count === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Budget Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No budget recommendations today. All campaigns are pacing well.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedRecs = openRecommendations.slice(0, 3);
  const remainingCount = count - displayedRecs.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Budget Recommendations</CardTitle>
            <Badge variant="secondary" className="ml-1">
              {count}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Optimize campaign budgets based on today's pacing
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedRecs.map(rec => (
          <BudgetRecommendationItem
            key={rec.id}
            rec={rec}
            onApply={applyRecommendation}
            onDismiss={dismissRecommendation}
          />
        ))}

        {remainingCount > 0 && (
          <Button variant="ghost" className="w-full text-muted-foreground" size="sm">
            +{remainingCount} more recommendation{remainingCount > 1 ? 's' : ''}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
