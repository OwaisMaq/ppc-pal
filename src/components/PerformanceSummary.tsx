
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import { usePerformanceData } from "@/hooks/usePerformanceData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

const PerformanceSummary = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedAsin, setSelectedAsin] = useState("all");
  const { connections } = useAmazonConnections();
  const { metrics, loading, hasData } = usePerformanceData();

  // Function to get filtered description based on selected filters
  const getFilteredDescription = () => {
    const parts = [];
    if (selectedCountry !== "all") {
      const countryLabels: { [key: string]: string } = {
        "US": "United States",
        "CA": "Canada", 
        "UK": "United Kingdom",
        "DE": "Germany",
        "FR": "France",
        "IT": "Italy",
        "ES": "Spain",
        "JP": "Japan",
        "AU": "Australia"
      };
      parts.push(`in ${countryLabels[selectedCountry] || selectedCountry}`);
    }
    if (selectedAsin !== "all") {
      parts.push(`for ${selectedAsin}`);
    }
    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">Loading your advertising performance metrics...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">
            Overview of your advertising performance metrics{getFilteredDescription()}
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connections.length === 0 
              ? "No Amazon accounts connected yet. Connect your Amazon Ads account to view performance data."
              : "No campaign data available yet. Sync your Amazon account to import campaign data."
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">Unable to calculate performance metrics</p>
        </div>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Overview of your advertising performance metrics{getFilteredDescription()}
        </p>
      </div>

      <FilterBar
        selectedCountry={selectedCountry}
        selectedAsin={selectedAsin}
        onCountryChange={setSelectedCountry}
        onAsinChange={setSelectedAsin}
      />

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

      {/* Additional metrics section */}
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
    </div>
  );
};

export default PerformanceSummary;
