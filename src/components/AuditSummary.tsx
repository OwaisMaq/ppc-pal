import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, AlertTriangle, Lightbulb, PoundSterling, Minus } from "lucide-react";
import { HealthScoreCircle } from "@/components/health";

interface AuditSummaryProps {
  totalSavings: number;
  totalInsights: number;
  criticalIssues: number;
  monthsAnalyzed: number;
  averageScore?: number | null;
  averageGrade?: string | null;
  scoreTrend?: "improving" | "declining" | "stable";
}

function getGradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function AuditSummary({ 
  totalSavings, 
  totalInsights, 
  criticalIssues, 
  monthsAnalyzed,
  averageScore,
  scoreTrend = "stable"
}: AuditSummaryProps) {
  const hasScore = averageScore !== null && averageScore !== undefined;
  const grade = hasScore ? getGradeFromScore(averageScore) : null;

  const trendConfig = {
    improving: { icon: TrendingUp, color: "text-success", label: "Improving" },
    declining: { icon: TrendingDown, color: "text-destructive", label: "Declining" },
    stable: { icon: Minus, color: "text-muted-foreground", label: "Stable" },
  };

  const TrendIcon = trendConfig[scoreTrend].icon;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Average Health Score */}
      {hasScore && grade && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <TrendIcon className={`h-4 w-4 ${trendConfig[scoreTrend].color}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <HealthScoreCircle score={averageScore} grade={grade} size="sm" />
              <div>
                <div className="text-xs text-muted-foreground">
                  {trendConfig[scoreTrend].label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimated Savings</CardTitle>
          <PoundSterling className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            £{totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Potential savings identified
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {criticalIssues}
          </div>
          <p className="text-xs text-muted-foreground">
            High-priority optimizations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalInsights}
          </div>
          <p className="text-xs text-muted-foreground">
            Optimization opportunities
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Months Analyzed</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {monthsAnalyzed}
          </div>
          <p className="text-xs text-muted-foreground">
            Historical data coverage
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
