
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceMetrics } from "@/types/performance";

interface AdditionalMetricsProps {
  metrics: PerformanceMetrics;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
}

const AdditionalMetrics = ({ metrics, formatCurrency, formatPercentage }: AdditionalMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Return on Ad Spend (ROAS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{metrics.averageRoas.toFixed(2)}x</div>
          <p className="text-sm text-green-600 font-medium">Real-time data</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Average Cost per Click
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.averageCpc)}</div>
          <p className="text-sm text-blue-600 font-medium">CPC across campaigns</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Conversion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.conversionRate)}</div>
          <p className="text-sm text-green-600 font-medium">Orders per click</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdditionalMetrics;
