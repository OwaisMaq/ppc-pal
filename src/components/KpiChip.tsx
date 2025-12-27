import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, Area, AreaChart } from "recharts";

interface KpiChipProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
  primary?: boolean;
  compact?: boolean;
  sparklineData?: Array<{ value: number }>;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral'; // For ACOS, lower is better
}

const KpiChip: React.FC<KpiChipProps> = ({ 
  label, 
  value, 
  change, 
  className,
  primary = false,
  compact = false,
  sparklineData,
  icon,
  trend = 'positive'
}) => {
  // Determine if the change direction is good or bad based on the metric type
  const isPositiveChange = change ? (
    trend === 'negative' 
      ? change.direction === 'down'  // For metrics like ACOS, down is good
      : change.direction === 'up'     // For metrics like Sales, up is good
  ) : null;

  const getChangeColor = () => {
    if (!change || change.direction === 'neutral') return 'text-muted-foreground bg-muted';
    if (isPositiveChange) return 'text-success bg-success/10';
    return 'text-error bg-error/10';
  };

  const getSparklineColor = () => {
    if (!change) return 'hsl(var(--primary))';
    if (isPositiveChange) return 'hsl(var(--success))';
    return 'hsl(var(--error))';
  };

  const getSparklineGradient = () => {
    if (!change) return 'url(#primaryGradient)';
    if (isPositiveChange) return 'url(#successGradient)';
    return 'url(#errorGradient)';
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border border-border",
      "transition-shadow duration-200",
      "hover:shadow-md",
      primary && "border-primary/30 bg-primary/5",
      className
    )}>
      {/* Subtle top accent line for primary cards */}
      {primary && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      )}
      
      <CardContent className={cn(
        "relative flex flex-col justify-between h-full",
        compact ? "p-3" : "p-4 md:p-5"
      )}>
        {/* Header with label and change indicator */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="flex-shrink-0 p-1.5 rounded-md bg-muted text-muted-foreground">
                {icon}
              </div>
            )}
            <span className={cn(
              "font-medium text-muted-foreground tracking-wide uppercase",
              compact ? "text-[10px]" : "text-xs"
            )}>
              {label}
            </span>
          </div>
          
          {change && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5",
              getChangeColor()
            )}>
              {change.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : change.direction === 'down' ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span className="text-[11px] font-semibold tabular-nums">
                {change.value}
              </span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex-1 flex items-end">
          <p className={cn(
            "font-display font-semibold tracking-tight tabular-nums",
            compact ? "text-xl" : primary ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
          )}>
            {value}
          </p>
        </div>
        
        {/* Sparkline with gradient fill */}
        {sparklineData && sparklineData.length > 1 && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 opacity-30 group-hover:opacity-50 transition-opacity",
            compact ? "h-10" : "h-14"
          )}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--error))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--error))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getSparklineColor()}
                  strokeWidth={1.5}
                  fill={getSparklineGradient()}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiChip;
