import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Ban,
  PauseCircle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { ActionOutcome } from '@/hooks/useActionOutcomes';
import { formatDistanceToNow } from 'date-fns';

interface OutcomeAttributionPanelProps {
  outcomes: ActionOutcome[];
  loading?: boolean;
}

const ACTION_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  negative_keyword: { icon: Ban, label: 'Negative Keyword', color: 'text-destructive' },
  negative_product: { icon: Ban, label: 'Negative Product', color: 'text-destructive' },
  pause_target: { icon: PauseCircle, label: 'Paused Target', color: 'text-warning' },
  pause_campaign: { icon: PauseCircle, label: 'Paused Campaign', color: 'text-warning' },
  set_bid: { icon: DollarSign, label: 'Bid Change', color: 'text-brand-primary' },
};

const OUTCOME_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  positive: { icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
  negative: { icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  neutral: { icon: Minus, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending: { icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  inconclusive: { icon: Minus, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export function OutcomeAttributionPanel({
  outcomes,
  loading,
}: OutcomeAttributionPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatMetricValue = (key: string, value: number) => {
    if (key.includes('acos') || key.includes('ctr') || key.includes('conversion')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (key.includes('spend') || key.includes('sales') || key.includes('bid') || key.includes('cpc')) {
      return `$${value.toFixed(2)}`;
    }
    return value.toFixed(0);
  };

  const formatDelta = (key: string, delta: number) => {
    const formatted = formatMetricValue(key, Math.abs(delta));
    const sign = delta > 0 ? '+' : '-';
    return `${sign}${formatted}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-brand-primary" />
          Outcome Attribution
        </CardTitle>
        <CardDescription>
          Track how each automation action performed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {outcomes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No outcomes recorded yet</p>
            <p className="text-xs mt-1">
              Outcomes are tracked 7 days after automation actions
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {outcomes.map((outcome) => {
                const statusConfig = OUTCOME_STATUS_CONFIG[outcome.outcome_status] || OUTCOME_STATUS_CONFIG.neutral;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={outcome.id}
                    className={`p-4 rounded-lg border ${statusConfig.bgColor}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {outcome.action_id.slice(0, 8)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(outcome.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Before/After Metrics */}
                        {outcome.metric_delta && Object.keys(outcome.metric_delta).length > 0 && (
                          <div className="space-y-1">
                            {Object.entries(outcome.metric_delta).slice(0, 3).map(([key, delta]) => {
                              const beforeValue = outcome.before_metrics[key];
                              const afterValue = outcome.after_metrics?.[key];
                              const numDelta = delta as number;
                              const isPositive = key.includes('sales') || key.includes('orders') || key.includes('roas')
                                ? numDelta > 0
                                : numDelta < 0; // For spend, acos - lower is better

                              return (
                                <div key={key} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {beforeValue !== undefined ? formatMetricValue(key, beforeValue) : '—'}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">
                                      {afterValue !== undefined ? formatMetricValue(key, afterValue) : '—'}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}
                                    >
                                      {formatDelta(key, numDelta)}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Outcome Status */}
                      <div className={`flex flex-col items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="h-6 w-6" />
                        <span className="text-xs font-medium capitalize">
                          {outcome.outcome_status}
                        </span>
                        {outcome.outcome_score !== null && (
                          <Badge variant="outline" className="text-xs">
                            Score: {outcome.outcome_score.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
