import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { Experiment } from '@/hooks/useExperiments';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';

interface ExperimentResultsPanelProps {
  experiment: Experiment;
}

const MetricRow = ({ label, treatment, baseline }: { label: string; treatment?: number; baseline?: number }) => {
  if (treatment == null && baseline == null) return null;
  const diff = treatment != null && baseline != null && baseline > 0
    ? ((treatment - baseline) / baseline) * 100
    : null;

  return (
    <div className="grid grid-cols-4 gap-2 items-center text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{baseline != null ? formatMetric(label, baseline) : '—'}</span>
      <span className="text-right font-medium">{treatment != null ? formatMetric(label, treatment) : '—'}</span>
      <span className={`text-right font-medium ${diff != null ? (diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : '') : ''}`}>
        {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
      </span>
    </div>
  );
};

function formatMetric(label: string, value: number): string {
  if (label.toLowerCase().includes('acos')) return `${value.toFixed(1)}%`;
  if (label.toLowerCase().includes('spend') || label.toLowerCase().includes('sales')) return `$${value.toFixed(2)}`;
  return value.toLocaleString();
}

export function ExperimentResultsPanel({ experiment }: ExperimentResultsPanelProps) {
  const { treatmentMetrics, baselineMetrics, incrementalLiftPercent, statisticalSignificance, isSignificant } = experiment;
  const confidencePct = statisticalSignificance != null ? statisticalSignificance * 100 : null;

  const duration = experiment.treatmentStartDate && experiment.treatmentEndDate
    ? differenceInDays(parseISO(experiment.treatmentEndDate), parseISO(experiment.treatmentStartDate))
    : null;

  const metricKeys = Array.from(new Set([
    ...Object.keys(treatmentMetrics || {}),
    ...Object.keys(baselineMetrics || {}),
  ]));

  const displayLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 flex-wrap">
        {incrementalLiftPercent != null && (
          <div className="flex items-center gap-1.5">
            {incrementalLiftPercent > 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={`text-lg font-bold ${incrementalLiftPercent > 0 ? 'text-success' : 'text-destructive'}`}>
              {incrementalLiftPercent > 0 ? '+' : ''}{incrementalLiftPercent.toFixed(1)}% lift
            </span>
          </div>
        )}

        {isSignificant != null && (
          <Badge variant={isSignificant ? 'default' : 'secondary'} className="gap-1">
            {isSignificant ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {isSignificant ? 'Significant at 95%' : 'Not significant'}
          </Badge>
        )}

        {duration != null && (
          <span className="text-sm text-muted-foreground">{duration} day treatment</span>
        )}
      </div>

      {/* Confidence bar */}
      {confidencePct != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Statistical Confidence</span>
            <span>{confidencePct.toFixed(0)}%</span>
          </div>
          <Progress value={confidencePct} className="h-2" />
        </div>
      )}

      {/* Metrics table */}
      {metricKeys.length > 0 && (
        <div>
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium border-b pb-1 mb-1">
            <span>Metric</span>
            <span className="text-right">Baseline</span>
            <span className="text-right">Treatment</span>
            <span className="text-right">Change</span>
          </div>
          {metricKeys.map(key => (
            <MetricRow
              key={key}
              label={displayLabel(key)}
              baseline={baselineMetrics?.[key]}
              treatment={treatmentMetrics?.[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
