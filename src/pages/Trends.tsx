
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Target } from 'lucide-react';
import FilterBar from '@/components/FilterBar';

const Trends = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedAsin, setSelectedAsin] = useState("all");

  // Mock monthly trend data
  const monthlyTrends = [
    { month: 'Jan 2024', sales: 95000, spend: 22000, profit: 73000, acos: 23.2, roas: 4.32 },
    { month: 'Feb 2024', sales: 102000, spend: 24500, profit: 77500, acos: 24.0, roas: 4.16 },
    { month: 'Mar 2024', sales: 108000, spend: 26000, profit: 82000, acos: 24.1, roas: 4.15 },
    { month: 'Apr 2024', sales: 115000, spend: 27500, profit: 87500, acos: 23.9, roas: 4.18 },
    { month: 'May 2024', sales: 119000, spend: 28000, profit: 91000, acos: 23.5, roas: 4.25 },
    { month: 'Jun 2024', sales: 124850, spend: 28420, profit: 96430, acos: 22.8, roas: 4.39 }
  ];

  const performanceMetrics = [
    { title: 'Sales Growth', value: '+31.4%', description: '6-month trend', icon: ShoppingCart, color: 'text-green-600' },
    { title: 'Spend Efficiency', value: '+29.2%', description: 'vs. 6 months ago', icon: DollarSign, color: 'text-blue-600' },
    { title: 'ROAS Improvement', value: '+1.6%', description: 'Monthly average', icon: TrendingUp, color: 'text-green-600' },
    { title: 'ACOS Reduction', value: '-1.7%', description: 'Cost optimization', icon: Target, color: 'text-green-600' }
  ];

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
    <AuthenticatedLayout>
      <div className="space-y-4 md:space-y-6 p-2 md:p-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 md:gap-3">
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            Trends
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Analyze performance trends and identify patterns in your campaigns{getFilteredDescription()}
          </p>
        </div>

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedAsin}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedAsin}
        />

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
                  <CardTitle className="text-xs md:text-sm font-medium text-gray-600 leading-tight">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                  <div className="text-lg md:text-2xl font-bold text-gray-900">{metric.value}</div>
                  <p className={`text-xs md:text-sm font-medium ${metric.color} leading-tight`}>
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sales and Spend Trends */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <Card className="h-full">
            <CardHeader className="px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-base md:text-lg">Sales & Spend Trends</CardTitle>
              <CardDescription className="text-xs md:text-sm">Monthly performance over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                <LineChart data={monthlyTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={10}
                    className="md:text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    fontSize={10}
                    className="md:text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                    labelStyle={{ fontSize: '12px' }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-base md:text-lg">Profit Trends</CardTitle>
              <CardDescription className="text-xs md:text-sm">Monthly profit after ad costs</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                <BarChart data={monthlyTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={10}
                    className="md:text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    fontSize={10}
                    className="md:text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Profit']}
                    labelStyle={{ fontSize: '12px' }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="profit" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ROAS and ACOS Trends */}
        <Card>
          <CardHeader className="px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Efficiency Metrics</CardTitle>
            <CardDescription className="text-xs md:text-sm">ROAS and ACOS trends over time</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
              <LineChart data={monthlyTrends} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  fontSize={10}
                  className="md:text-xs"
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="left" 
                  fontSize={10}
                  className="md:text-xs"
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  fontSize={10}
                  className="md:text-xs"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'ACOS' ? `${value}%` : `${value}x`,
                    name
                  ]}
                  labelStyle={{ fontSize: '12px' }}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="roas" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="ROAS" 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="acos" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  name="ACOS" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
