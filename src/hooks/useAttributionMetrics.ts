import { useState, useCallback } from 'react';
import { AttributionWindow, AttributionMetrics } from '@/lib/amazon/types';

export const useAttributionMetrics = () => {
  const [selectedAttribution, setSelectedAttribution] = useState<AttributionWindow>('14d');

  const getMetricByAttribution = useCallback((
    metrics: AttributionMetrics,
    metricType: 'acos' | 'roas' | 'sales' | 'orders',
    attribution?: AttributionWindow
  ): number | undefined => {
    const window = attribution || selectedAttribution;
    const key = `${metricType}_${window}` as keyof AttributionMetrics;
    return metrics[key];
  }, [selectedAttribution]);

  const formatMetricWithAttribution = useCallback((
    metrics: AttributionMetrics,
    metricType: 'acos' | 'roas' | 'sales' | 'orders',
    attribution?: AttributionWindow
  ): string => {
    const value = getMetricByAttribution(metrics, metricType, attribution);
    
    if (value === undefined || value === null) {
      return '—';
    }

    switch (metricType) {
      case 'acos':
        return `${value.toFixed(1)}%`;
      case 'roas':
        return value.toFixed(2);
      case 'sales':
        return `$${value.toLocaleString()}`;
      case 'orders':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }, [getMetricByAttribution]);

  const compareAttributionWindows = useCallback((
    metrics: AttributionMetrics,
    metricType: 'acos' | 'roas' | 'sales' | 'orders'
  ): {
    value_7d: number | undefined;
    value_14d: number | undefined;
    difference: number | undefined;
    percentChange: number | undefined;
  } => {
    const value_7d = getMetricByAttribution(metrics, metricType, '7d');
    const value_14d = getMetricByAttribution(metrics, metricType, '14d');
    
    if (value_7d === undefined || value_14d === undefined) {
      return {
        value_7d,
        value_14d,
        difference: undefined,
        percentChange: undefined
      };
    }

    const difference = value_14d - value_7d;
    const percentChange = value_7d !== 0 ? (difference / value_7d) * 100 : undefined;

    return {
      value_7d,
      value_14d,
      difference,
      percentChange
    };
  }, [getMetricByAttribution]);

  return {
    selectedAttribution,
    setSelectedAttribution,
    getMetricByAttribution,
    formatMetricWithAttribution,
    compareAttributionWindows
  };
};