import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardShell from "@/components/DashboardShell";
import { useReportCard } from "@/hooks/useReportCard";
import { Shield, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, PiggyBank, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const formatCurrency = (amount: number) =>
  `£${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const DeltaIndicator = ({ value }: { value: number }) => {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-success" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-error" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const ReportCard = () => {
  const { data, loading } = useReportCard();

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6 p-4 md:p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <Shield className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No report data available</p>
          <p className="text-sm mt-1">Connect an Amazon account and let PPC Pal start working.</p>
        </div>
      </DashboardShell>
    );
  }

  const savingsCategories = [
    { label: 'Wasted Clicks Blocked', value: data.savings.negativeKeywords, color: 'bg-primary' },
    { label: 'Bids Optimised', value: data.savings.bidOptimisation, color: 'bg-accent' },
    { label: 'Underperformers Paused', value: data.savings.pausedTargets, color: 'bg-warning' },
    { label: 'ACoS Improvements', value: data.savings.acosImprovement, color: 'bg-info' },
  ];

  const maxSaving = Math.max(...savingsCategories.map(c => c.value), 1);

  return (
    <DashboardShell>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Monthly Report Card</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.monthLabel}</p>
        </div>

        {/* Hero: Total Savings */}
        <Card className="border-accent/30">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Savings This Month</p>
            <p className="text-5xl md:text-6xl font-display font-bold text-accent mt-2">
              {formatCurrency(data.savings.total)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              From {data.actionsApplied} automated decisions
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Decisions Made + Outcome Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Decisions Made
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-display font-bold">{data.actionsApplied}</div>
              {data.outcomes.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Outcome breakdown</span>
                    <span className="font-medium">{data.outcomes.winRate.toFixed(0)}% win rate</span>
                  </div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {data.outcomes.positive > 0 && (
                      <div
                        className="bg-success rounded-l-full"
                        style={{ width: `${(data.outcomes.positive / data.outcomes.total) * 100}%` }}
                      />
                    )}
                    {data.outcomes.neutral > 0 && (
                      <div
                        className="bg-muted-foreground/30"
                        style={{ width: `${(data.outcomes.neutral / data.outcomes.total) * 100}%` }}
                      />
                    )}
                    {data.outcomes.negative > 0 && (
                      <div
                        className="bg-error rounded-r-full"
                        style={{ width: `${(data.outcomes.negative / data.outcomes.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-success">{data.outcomes.positive} positive</span>
                    <span>{data.outcomes.neutral} neutral</span>
                    <span className="text-error">{data.outcomes.negative} negative</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Savings Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-accent" />
                Savings Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {savingsCategories.map((cat) => (
                <div key={cat.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                  <Progress
                    value={(cat.value / maxSaving) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Month-over-Month Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Month-over-Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Spend', value: data.mom.thisMonthSpend, delta: data.mom.spendDelta, invertColor: true },
                { label: 'Sales', value: data.mom.thisMonthSales, delta: data.mom.salesDelta, invertColor: false },
                { label: 'ACoS', value: data.mom.thisMonthAcos, delta: data.mom.thisMonthAcos - data.mom.lastMonthAcos, invertColor: true, isPercent: true },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-xl font-display font-semibold">
                      {metric.isPercent ? `${metric.value.toFixed(1)}%` : formatCurrency(metric.value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DeltaIndicator value={metric.invertColor ? -metric.delta : metric.delta} />
                    <span className={`text-sm font-medium ${
                      (metric.invertColor ? -metric.delta : metric.delta) > 0 ? 'text-success' :
                      (metric.invertColor ? -metric.delta : metric.delta) < 0 ? 'text-error' :
                      'text-muted-foreground'
                    }`}>
                      {formatPercent(metric.delta)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Guardian Status */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Guardian Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                PPC Pal made <span className="font-semibold">{data.actionsApplied}</span> automated decisions this month.
                {data.outcomes.total > 0 && (
                  <> <span className="font-semibold text-accent">{data.outcomes.winRate.toFixed(0)}%</span> improved performance.</>
                )}
              </p>
              {data.alertsRaised > 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{data.alertsRaised} alert{data.alertsRaised !== 1 ? 's' : ''} raised</span>
                </div>
              )}
              {data.savings.total > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  Estimated {formatCurrency(data.savings.total)} saved in wasted or inefficient spend.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
};

export default ReportCard;
