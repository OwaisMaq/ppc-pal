
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Trends
          </h1>
          <p className="text-gray-600">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <p className={`text-sm font-medium ${metric.color}`}>
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sales and Spend Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales & Spend Trends</CardTitle>
              <CardDescription>Monthly performance over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit Trends</CardTitle>
              <CardDescription>Monthly profit after ad costs</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Profit']} />
                  <Bar dataKey="profit" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ROAS and ACOS Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Metrics</CardTitle>
            <CardDescription>ROAS and ACOS trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'ACOS' ? `${value}%` : `${value}x`,
                    name
                  ]} 
                />
                <Legend />
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
