import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodComparison } from '@/components/campaigns/PeriodComparison';
import { TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricData {
  current: number;
  previous: number;
}

interface ComparisonKPIsProps {
  spend: MetricData;
  sales: MetricData;
  acos: MetricData;
  roas: MetricData;
  clicks: MetricData;
  impressions: MetricData;
  orders: MetricData;
  loading?: boolean;
  periodLabel?: string;
}

export const ComparisonKPIs = ({
  spend,
  sales,
  acos,
  roas,
  clicks,
  impressions,
  orders,
  loading = false,
  periodLabel = 'vs previous period',
}: ComparisonKPIsProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-US', {
      notation: value > 100000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);

  const metrics = [
    { 
      label: 'Spend', 
      data: spend, 
      format: 'currency' as const, 
      higherIsBetter: false,
      icon: DollarSign,
      color: 'text-orange-500'
    },
    { 
      label: 'Sales', 
      data: sales, 
      format: 'currency' as const, 
      higherIsBetter: true,
      icon: ShoppingCart,
      color: 'text-success'
    },
    { 
      label: 'ACoS', 
      data: acos, 
      format: 'percent' as const, 
      higherIsBetter: false,
      icon: TrendingDown,
      color: 'text-primary'
    },
    { 
      label: 'ROAS', 
      data: roas, 
      format: 'number' as const, 
      higherIsBetter: true,
      icon: TrendingUp,
      color: 'text-primary'
    },
    { 
      label: 'Clicks', 
      data: clicks, 
      format: 'number' as const, 
      higherIsBetter: true,
      icon: MousePointerClick,
      color: 'text-blue-500'
    },
    { 
      label: 'Impressions', 
      data: impressions, 
      format: 'number' as const, 
      higherIsBetter: true,
      icon: Eye,
      color: 'text-purple-500'
    },
    { 
      label: 'Orders', 
      data: orders, 
      format: 'number' as const, 
      higherIsBetter: true,
      icon: ShoppingCart,
      color: 'text-success'
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const formattedValue = metric.format === 'currency' 
          ? formatCurrency(metric.data.current)
          : metric.format === 'percent'
          ? `${metric.data.current.toFixed(1)}%`
          : formatNumber(metric.data.current);

        return (
          <Card key={metric.label} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={cn("h-4 w-4", metric.color)} />
                <span className="text-xs text-muted-foreground font-medium">
                  {metric.label}
                </span>
              </div>
              <div className="text-lg font-semibold mb-1">
                {formattedValue}
              </div>
              <PeriodComparison
                currentValue={metric.data.current}
                previousValue={metric.data.previous}
                format={metric.format}
                higherIsBetter={metric.higherIsBetter}
                compact
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
