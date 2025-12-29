import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonMetrics {
  current: number;
  previous: number;
}

interface PeriodComparisonProps {
  currentValue: number;
  previousValue: number;
  format?: 'currency' | 'percent' | 'number';
  higherIsBetter?: boolean;
  showBadge?: boolean;
  compact?: boolean;
}

export const PeriodComparison = ({
  currentValue,
  previousValue,
  format = 'number',
  higherIsBetter = true,
  showBadge = true,
  compact = false,
}: PeriodComparisonProps) => {
  const { change, percentChange, direction, isPositive } = useMemo(() => {
    const change = currentValue - previousValue;
    const percentChange = previousValue !== 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : currentValue > 0 ? 100 : 0;
    
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const isPositive = higherIsBetter ? change > 0 : change < 0;
    
    return { change, percentChange, direction, isPositive };
  }, [currentValue, previousValue, higherIsBetter]);

  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(Math.round(value));
    }
  };

  const formatChange = (value: number): string => {
    const prefix = value > 0 ? '+' : '';
    switch (format) {
      case 'currency':
        return `${prefix}${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)}`;
      case 'percent':
        return `${prefix}${value.toFixed(1)}pp`;
      case 'number':
      default:
        return `${prefix}${new Intl.NumberFormat('en-US').format(Math.round(value))}`;
    }
  };

  if (Math.abs(percentChange) < 0.5) {
    // No significant change
    if (!showBadge) return null;
    return (
      <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
        <Minus className="h-3 w-3" />
        {compact ? '0%' : 'No change'}
      </Badge>
    );
  }

  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  
  if (showBadge) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1 text-xs font-normal",
          isPositive 
            ? "text-success border-success/30" 
            : "text-destructive border-destructive/30"
        )}
      >
        <Icon className="h-3 w-3" />
        {compact 
          ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`
          : formatChange(change)
        }
      </Badge>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs",
      isPositive ? "text-success" : "text-destructive"
    )}>
      <Icon className="h-3 w-3" />
      {percentChange > 0 ? '+' : ''}{percentChange.toFixed(0)}%
    </span>
  );
};

// Hook to calculate comparison data for a dataset
export const useComparisonData = <T extends Record<string, number>>(
  currentData: T | null,
  previousData: T | null,
  metrics: (keyof T)[]
): Record<keyof T, { current: number; previous: number; change: number; percentChange: number }> => {
  return useMemo(() => {
    const result = {} as Record<keyof T, { current: number; previous: number; change: number; percentChange: number }>;
    
    metrics.forEach(metric => {
      const current = currentData?.[metric] ?? 0;
      const previous = previousData?.[metric] ?? 0;
      const change = current - previous;
      const percentChange = previous !== 0 
        ? ((current - previous) / previous) * 100 
        : current > 0 ? 100 : 0;
      
      result[metric] = { current, previous, change, percentChange };
    });
    
    return result;
  }, [currentData, previousData, metrics]);
};
