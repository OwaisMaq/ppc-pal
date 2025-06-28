
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  averageAcos: number;
  averageRoas: number;
  clickThroughRate: number;
  conversionRate: number;
}

interface AdditionalMetricsProps {
  metrics: PerformanceMetrics;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}

const AdditionalMetrics = ({ metrics, formatCurrency, formatPercentage }: AdditionalMetricsProps) => {
  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Ratios</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average ACOS</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(metrics.averageAcos)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Advertising Cost of Sales</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average ROAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.averageRoas.toFixed(2)}x
            </div>
            <p className="text-xs text-gray-500 mt-1">Return on Ad Spend</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Click-Through Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(metrics.clickThroughRate)}
            </div>
            <p className="text-xs text-gray-500 mt-1">CTR</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatPercentage(metrics.conversionRate)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Orders / Clicks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdditionalMetrics;
