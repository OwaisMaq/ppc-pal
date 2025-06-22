
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, ShoppingCart } from "lucide-react";
import { PerformanceMetrics } from "@/hooks/usePerformanceData";

interface PerformanceMetricCardsProps {
  metrics: PerformanceMetrics;
  formatCurrency: (value: number) => string;
}

const PerformanceMetricCards = ({ metrics, formatCurrency }: PerformanceMetricCardsProps) => {
  const performanceData = [
    {
      title: "Total Sales",
      value: formatCurrency(metrics.totalSales),
      change: "+12.5%", // TODO: Calculate actual change when historical data is available
      changeType: "increase" as const,
      icon: ShoppingCart,
      description: "Revenue from all campaigns"
    },
    {
      title: "Total Ad Spend",
      value: formatCurrency(metrics.totalSpend),
      change: "-3.2%", // TODO: Calculate actual change when historical data is available
      changeType: "decrease" as const,
      icon: DollarSign,
      description: "Amount spent on advertising"
    },
    {
      title: "Total Ad Profit",
      value: formatCurrency(metrics.totalProfit),
      change: "+18.7%", // TODO: Calculate actual change when historical data is available
      changeType: "increase" as const,
      icon: TrendingUp,
      description: "Profit after ad costs"
    },
    {
      title: "Cost per Unit Sold",
      value: formatCurrency(metrics.averageCostPerUnit),
      change: "-5.8%", // TODO: Calculate actual change when historical data is available
      changeType: "decrease" as const,
      icon: Target,
      description: "Average cost per unit"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {performanceData.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.changeType === 'increase';
        
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
                  <span
                    className={`text-sm font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500">vs last month</span>
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
  );
};

export default PerformanceMetricCards;
