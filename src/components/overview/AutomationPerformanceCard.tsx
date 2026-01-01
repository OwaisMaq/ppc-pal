import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

interface OutcomeStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  pending: number;
  averageScore: number;
}

interface AutomationPerformanceCardProps {
  outcomeStats: OutcomeStats | null;
  totalSavings: number;
  actionCount: number;
  loading?: boolean;
}

export function AutomationPerformanceCard({
  outcomeStats,
  totalSavings,
  actionCount,
  loading = false
}: AutomationPerformanceCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMeasured = (outcomeStats?.positive || 0) + 
                        (outcomeStats?.neutral || 0) + 
                        (outcomeStats?.negative || 0);
  
  const winRate = totalMeasured > 0 
    ? Math.round(((outcomeStats?.positive || 0) / totalMeasured) * 100)
    : 0;

  // Determine status based on win rate
  const getStatus = () => {
    if (totalMeasured === 0) {
      return { label: "Learning", color: "text-muted-foreground", bg: "bg-muted", icon: TrendingUp };
    }
    if (winRate >= 70) {
      return { label: "Working Well", color: "text-success", bg: "bg-success/10", icon: CheckCircle };
    }
    if (winRate >= 50) {
      return { label: "Needs Review", color: "text-warning", bg: "bg-warning/10", icon: AlertCircle };
    }
    return { label: "Issues Detected", color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Generate summary text
  const getSummary = () => {
    if (actionCount === 0) {
      return "No automation actions yet. Enable rules to start optimizing.";
    }
    if (totalSavings > 0) {
      return `Automation made ${actionCount} optimizations, saving an estimated ${formatCurrency(totalSavings)}.`;
    }
    return `Automation made ${actionCount} optimizations to improve your campaigns.`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Automation Performance</CardTitle>
          <Badge variant="outline" className={`${status.color} ${status.bg} gap-1.5`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className={`text-2xl font-bold ${winRate >= 70 ? 'text-success' : winRate >= 50 ? 'text-warning' : totalMeasured > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {totalMeasured > 0 ? `${winRate}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">
              {totalSavings > 0 ? formatCurrency(totalSavings) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Saved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{actionCount}</p>
            <p className="text-xs text-muted-foreground">Actions</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">{getSummary()}</p>
      </CardContent>
    </Card>
  );
}
