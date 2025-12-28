import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Target,
  Zap,
} from 'lucide-react';
import { OutcomeStats } from '@/hooks/useActionOutcomes';

interface TrustReportCardProps {
  stats: OutcomeStats;
  totalSavings: number;
  actionCount: number;
  loading?: boolean;
}

export function TrustReportCard({
  stats,
  totalSavings,
  actionCount,
  loading,
}: TrustReportCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const winRate = stats.total > 0
    ? Math.round((stats.positive / (stats.total - stats.pending)) * 100) || 0
    : 0;

  const getTrustLevel = () => {
    if (stats.total < 5) return { label: 'Building Trust', color: 'bg-muted text-muted-foreground', description: 'More data needed' };
    if (winRate >= 70) return { label: 'High Trust', color: 'bg-success/10 text-success', description: 'Automation performing well' };
    if (winRate >= 50) return { label: 'Moderate Trust', color: 'bg-warning/10 text-warning', description: 'Room for improvement' };
    return { label: 'Low Trust', color: 'bg-destructive/10 text-destructive', description: 'Review automation rules' };
  };

  const trustLevel = getTrustLevel();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-brand-primary/10">
              <Shield className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <CardTitle>Automation Trust Report</CardTitle>
              <CardDescription>How well automation is working for you</CardDescription>
            </div>
          </div>
          <Badge className={trustLevel.color}>{trustLevel.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Rate & Outcomes */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="text-2xl font-bold">{winRate}%</span>
            </div>
            <Progress value={winRate} className="h-2" />
            <p className="text-xs text-muted-foreground">{trustLevel.description}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Positive</span>
              </div>
              <span className="font-medium">{stats.positive}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span>Neutral</span>
              </div>
              <span className="font-medium">{stats.neutral}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>Negative</span>
              </div>
              <span className="font-medium">{stats.negative}</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span>Pending</span>
                </div>
                <span className="font-medium">{stats.pending}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-success">{formatCurrency(totalSavings)}</p>
            <p className="text-xs text-muted-foreground">Est. Savings</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Zap className="h-5 w-5 mx-auto mb-1 text-brand-primary" />
            <p className="text-lg font-bold">{actionCount}</p>
            <p className="text-xs text-muted-foreground">Actions Taken</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Target className="h-5 w-5 mx-auto mb-1 text-brand-primary" />
            <p className="text-lg font-bold">{stats.averageScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg. Score</p>
          </div>
        </div>

        {/* Summary Statement */}
        {stats.total > 0 && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-center">
              {stats.positive > stats.negative ? (
                <span className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Automation is delivering positive results. Keep it running!
                </span>
              ) : stats.negative > stats.positive ? (
                <span className="flex items-center justify-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Consider reviewing your automation rules for better outcomes.
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  Results are balanced. Monitor for trends.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
