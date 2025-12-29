import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ScoreBreakdown } from "@/hooks/useHistoricalAudit";

interface ScoreBreakdownBarsProps {
  breakdown: ScoreBreakdown;
  compact?: boolean;
}

const metricLabels: Record<keyof ScoreBreakdown, { label: string; unit: string; inverse?: boolean }> = {
  acosEfficiency: { label: "ACoS Efficiency", unit: "%", inverse: true },
  conversionRate: { label: "Conversion Rate", unit: "%" },
  ctr: { label: "CTR", unit: "%" },
  budgetUtilization: { label: "Budget Utilization", unit: "x" },
  wasteRatio: { label: "Waste Ratio", unit: "%", inverse: true },
};

function getScoreColor(score: number) {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-warning";
  if (score >= 30) return "bg-orange-500";
  return "bg-destructive";
}

function formatValue(value: number, unit: string) {
  if (unit === "x") return `${value.toFixed(2)}x`;
  return `${value.toFixed(1)}%`;
}

export function ScoreBreakdownBars({ breakdown, compact = false }: ScoreBreakdownBarsProps) {
  if (!breakdown) return null;

  const metrics = Object.entries(breakdown) as [keyof ScoreBreakdown, ScoreBreakdown[keyof ScoreBreakdown]][];

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {metrics.map(([key, data]) => {
        const config = metricLabels[key];
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {config.label}
                {!compact && (
                  <span className="ml-1 text-foreground/60">
                    ({data.weight}% weight)
                  </span>
                )}
              </span>
              <span className="font-medium">
                {data.score}/100
                {!compact && (
                  <span className="ml-1 text-muted-foreground">
                    ({formatValue(data.value, config.unit)})
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  getScoreColor(data.score)
                )}
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
