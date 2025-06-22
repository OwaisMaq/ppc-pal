
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, ShoppingCart, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PerformanceMetrics } from "@/types/performance";

interface PerformanceMetricCardsProps {
  metrics: PerformanceMetrics;
  formatCurrency: (value: number) => string;
}

const PerformanceMetricCards = ({ metrics, formatCurrency }: PerformanceMetricCardsProps) => {
  const performanceData = [
    {
      title: "Total Sales",
      value: formatCurrency(metrics.totalSales),
      change: `${metrics.salesChange >= 0 ? '+' : ''}${metrics.salesChange.toFixed(1)}%`,
      changeType: metrics.salesChange >= 0 ? "increase" as const : "decrease" as const,
      icon: ShoppingCart,
      description: "Revenue from all campaigns"
    },
    {
      title: "Total Ad Spend",
      value: formatCurrency(metrics.totalSpend),
      change: `${metrics.spendChange >= 0 ? '+' : ''}${metrics.spendChange.toFixed(1)}%`,
      changeType: metrics.spendChange <= 0 ? "increase" as const : "decrease" as const, // Lower spend is better
      icon: DollarSign,
      description: "Amount spent on advertising"
    },
    {
      title: "Total Ad Profit",
      value: formatCurrency(metrics.totalProfit),
      change: `${metrics.profitChange >= 0 ? '+' : ''}${metrics.profitChange.toFixed(1)}%`,
      changeType: metrics.profitChange >= 0 ? "increase" as const : "decrease" as const,
      icon: TrendingUp,
      description: "Profit after ad costs"
    },
    {
      title: "Cost per Unit Sold",
      value: formatCurrency(metrics.averageCostPerUnit),
      change: `${metrics.ordersChange >= 0 ? '+' : ''}${metrics.ordersChange.toFixed(1)}%`,
      changeType: metrics.ordersChange >= 0 ? "increase" as const : "decrease" as const,
      icon: Target,
      description: "Average cost per unit"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Data Quality Indicator */}
      {metrics.hasSimulatedData && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">Data Quality Notice</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">{metrics.dataSourceInfo}</p>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceData.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.changeType === 'increase';
          const hasValidChange = Math.abs(parseFloat(metric.change)) > 0;
          
          return (
            <Card key={metric.title} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasValidChange ? (
                      <>
                        <span
                          className={`text-sm font-medium ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {metric.change}
                        </span>
                        <span className="text-sm text-gray-500">vs last month</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">No historical data</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {metric.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceMetricCards;
