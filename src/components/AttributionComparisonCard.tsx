import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AttributionMetrics } from '@/lib/amazon/types';
import { useAttributionMetrics } from '@/hooks/useAttributionMetrics';

interface AttributionComparisonCardProps {
  metrics: AttributionMetrics;
  title: string;
  className?: string;
}

export const AttributionComparisonCard: React.FC<AttributionComparisonCardProps> = ({
  metrics,
  title,
  className = ""
}) => {
  const { compareAttributionWindows, formatMetricWithAttribution } = useAttributionMetrics();

  const acosComparison = compareAttributionWindows(metrics, 'acos');
  const roasComparison = compareAttributionWindows(metrics, 'roas');
  const salesComparison = compareAttributionWindows(metrics, 'sales');

  const formatPercentChange = (change: number | undefined) => {
    if (change === undefined || change === null) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getTrendIcon = (change: number | undefined, isGoodWhenHigher: boolean = true) => {
    if (change === undefined || change === null) return null;
    const isPositive = change > 0;
    const isGood = isGoodWhenHigher ? isPositive : !isPositive;
    return isPositive ? 
      <TrendingUp className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} /> : 
      <TrendingDown className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title} - Attribution Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ACoS Comparison */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">ACoS</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">7-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'acos', '7d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">14-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'acos', '14d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Change:</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(acosComparison.percentChange, false)}
                  <span className="text-xs">
                    {formatPercentChange(acosComparison.percentChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RoAS Comparison */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">RoAS</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">7-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'roas', '7d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">14-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'roas', '14d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Change:</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(roasComparison.percentChange, true)}
                  <span className="text-xs">
                    {formatPercentChange(roasComparison.percentChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Comparison */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Sales</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">7-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'sales', '7d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">14-day:</span>
                <span className="text-sm font-medium">
                  {formatMetricWithAttribution(metrics, 'sales', '14d')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Change:</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(salesComparison.percentChange, true)}
                  <span className="text-xs">
                    {formatPercentChange(salesComparison.percentChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              API v3 Data
            </Badge>
            <Badge variant="outline" className="text-xs">
              Pre-calculated Metrics
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};