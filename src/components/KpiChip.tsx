import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiChipProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    direction: 'up' | 'down';
  };
  className?: string;
  primary?: boolean;
  compact?: boolean;
  sparklineData?: Array<{ value: number }>;
}

const KpiChip: React.FC<KpiChipProps> = ({ 
  label, 
  value, 
  change, 
  className,
  primary = false,
  compact = false,
  sparklineData
}) => {
  return (
    <Card className={cn(
      "transition-all duration-200",
      primary ? "border-primary/20 bg-primary/5" : "border-muted",
      className
    )}>
      <CardContent className={cn(
        "flex flex-col",
        compact ? "p-3" : "p-4"
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-muted-foreground font-medium mb-1",
              compact ? "text-xs" : "text-sm"
            )}>
              {label}
            </p>
            <p className={cn(
              "font-bold truncate",
              compact ? "text-lg" : primary ? "text-2xl" : "text-xl"
            )}>
              {value}
            </p>
          </div>
          
          {change && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5",
              change.direction === 'up' 
                ? "bg-success/10 text-success" 
                : "bg-destructive/10 text-destructive"
            )}>
              {change.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-xs font-semibold">
                {change.value}
              </span>
            </div>
          )}
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="h-8 -mx-2 -mb-2 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiChip;
