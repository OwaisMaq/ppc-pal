import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Calendar, AlertTriangle } from "lucide-react";
import { WeeklyMetrics } from "@/types/weeklyMetrics";

interface WeeklyPerformanceMetricsProps {
  metrics: WeeklyMetrics;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
}

const WeeklyPerformanceMetrics = ({ metrics, formatCurrency, formatPercentage }: WeeklyPerformanceMetricsProps) => {
  const weeklyData = [
    {
      title: "7-Day Sales",
      value: formatCurrency(metrics.totalSales),
      change: `${metrics.salesChange >= 0 ? '+' : ''}${metrics.salesChange.toFixed(1)}%`,
      changeType: metrics.salesChange >= 0 ? "increase" as const : "decrease" as const,
      icon: ShoppingCart,
      description: "Revenue from last 7 days"
    },
    {
      title: "7-Day Ad Spend",
      value: formatCurrency(metrics.totalSpend),
      change: `${metrics.spendChange >= 0 ? '+' : ''}${metrics.spendChange.toFixed(1)}%`,
      changeType: metrics.spendChange <= 0 ? "increase" as const : "decrease" as const,
      icon: DollarSign,
      description: "Ad spend from last 7 days"
    },
    {
      title: "7-Day Profit",
      value: formatCurrency(metrics.totalProfit),
      change: `${metrics.profitChange >= 0 ? '+' : ''}${metrics.profitChange.toFixed(1)}%`,
      changeType: metrics.profitChange >= 0 ? "increase" as const : "decrease" as const,
      icon: TrendingUp,
      description: "Profit from last 7 days"
    },
    {
      title: "7-Day Orders",
      value: metrics.totalOrders.toLocaleString(),
      change: `${metrics.ordersChange >= 0 ? '+' : ''}${metrics.ordersChange.toFixed(1)}%`,
      changeType: metrics.ordersChange >= 0 ? "increase" as const : "decrease" as const,
      icon: Target,
      description: "Orders from last 7 days"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-2">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">7-Day Performance Overview</h3>
          <p className="text-sm text-gray-600">Performance metrics from the last 7 days compared to previous week</p>
        </div>
      </div>

      {/* Data Quality Notice */}
      <Card className={`border-${metrics.hasRealData ? 'blue' : 'orange'}-200 bg-${metrics.hasRealData ? 'blue' : 'orange'}-50`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 text-${metrics.hasRealData ? 'blue' : 'orange'}-600`} />
            <span className={`text-sm text-${metrics.hasRealData ? 'blue' : 'orange'}-700 font-medium`}>
              Weekly Data Quality
            </span>
          </div>
          <p className={`text-sm text-${metrics.hasRealData ? 'blue' : 'orange'}-600 mt-1`}>
            {metrics.dataSourceInfo}
          </p>
        </CardContent>
      </Card>

      {/* Weekly Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {weeklyData.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.changeType === 'increase';
          const hasValidChange = Math.abs(parseFloat(metric.change)) > 0;
          
          return (
            <Card key={metric.title} className="relative border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-green-600" />
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
                        <span className="text-sm text-gray-500">vs previous week</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">No comparison data</span>
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

      {/* Additional Weekly Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              7-Day ACOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.averageAcos)}</div>
            <p className="text-sm text-green-600 font-medium">Ad Cost of Sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              7-Day ROAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.averageRoas.toFixed(2)}x</div>
            <p className="text-sm text-blue-600 font-medium">Return on Ad Spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              7-Day Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.conversionRate)}</div>
            <p className="text-sm text-purple-600 font-medium">Click to order rate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeeklyPerformanceMetrics;
