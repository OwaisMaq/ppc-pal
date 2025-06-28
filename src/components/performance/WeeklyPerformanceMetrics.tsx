
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, ShoppingCart, MousePointer, Eye } from "lucide-react";

interface WeeklyMetrics {
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

interface WeeklyPerformanceMetricsProps {
  metrics: WeeklyMetrics;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}

const WeeklyPerformanceMetrics = ({ 
  metrics, 
  formatCurrency, 
  formatPercentage 
}: WeeklyPerformanceMetricsProps) => {
  const cards = [
    {
      title: "7-Day Sales",
      value: formatCurrency(metrics.totalSales),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "7-Day Spend",
      value: formatCurrency(metrics.totalSpend),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "7-Day Orders",
      value: metrics.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "7-Day Clicks",
      value: metrics.totalClicks.toLocaleString(),
      icon: MousePointer,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "7-Day Impressions",
      value: metrics.totalImpressions.toLocaleString(),
      icon: Eye,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">7-Day Performance Overview</h3>
          <p className="text-gray-600">Real-time campaign performance from the last 7 days</p>
        </div>
        <Badge variant="default" className="bg-green-100 text-green-800">
          Real Amazon Data
        </Badge>
      </div>

      {/* Main metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional performance metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg ACOS</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">Avg ROAS</CardTitle>
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

export default WeeklyPerformanceMetrics;
