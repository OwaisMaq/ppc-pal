
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, MousePointer, Eye } from "lucide-react";

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

interface PerformanceMetricCardsProps {
  metrics: PerformanceMetrics;
  formatCurrency: (amount: number) => string;
}

const PerformanceMetricCards = ({ metrics, formatCurrency }: PerformanceMetricCardsProps) => {
  const cards = [
    {
      title: "Total Sales",
      value: formatCurrency(metrics.totalSales),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Spend",
      value: formatCurrency(metrics.totalSpend),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Clicks",
      value: metrics.totalClicks.toLocaleString(),
      icon: MousePointer,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Impressions",
      value: metrics.totalImpressions.toLocaleString(),
      icon: Eye,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
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
  );
};

export default PerformanceMetricCards;
