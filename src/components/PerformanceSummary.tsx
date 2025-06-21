
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, ShoppingCart } from "lucide-react";
import FilterBar from "@/components/FilterBar";

const PerformanceSummary = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedAsin, setSelectedAsin] = useState("all");

  const performanceData = [
    {
      title: "Total Sales",
      value: "$124,850",
      change: "+12.5%",
      changeType: "increase" as const,
      icon: ShoppingCart,
      description: "Revenue from all campaigns"
    },
    {
      title: "Total Ad Spend",
      value: "$28,420",
      change: "-3.2%",
      changeType: "decrease" as const,
      icon: DollarSign,
      description: "Amount spent on advertising"
    },
    {
      title: "Total Ad Profit",
      value: "$96,430",
      change: "+18.7%",
      changeType: "increase" as const,
      icon: TrendingUp,
      description: "Profit after ad costs"
    },
    {
      title: "Cost per Unit Sold",
      value: "$8.45",
      change: "-5.8%",
      changeType: "decrease" as const,
      icon: Target,
      description: "Average cost per unit"
    }
  ];

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
            <div className="text-2xl font-bold text-gray-900">4.39x</div>
            <p className="text-sm text-green-600 font-medium">+0.32x vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">$89.32</div>
            <p className="text-sm text-green-600 font-medium">+$5.20 vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">3.8%</div>
            <p className="text-sm text-green-600 font-medium">+0.5% vs last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceSummary;
