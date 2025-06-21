import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface TrendData {
  name: string;
  sales: number;
  spend: number;
  profit: number;
}

const Trends = () => {
  const trendsData = [
    { name: "Jan", sales: 4000, spend: 2400, profit: 1600 },
    { name: "Feb", sales: 3000, spend: 1398, profit: 1602 },
    { name: "Mar", sales: 2000, spend: 9800, profit: -7800 },
    { name: "Apr", sales: 2780, spend: 3908, profit: -1128 },
    { name: "May", sales: 1890, spend: 4800, profit: -2910 },
    { name: "Jun", sales: 2390, spend: 3800, profit: -1410 },
    { name: "Jul", sales: 3490, spend: 4300, profit: -810 },
  ];

  const totalUsers = 1234;
  const newUserGrowth = 12;

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Trends & Insights</h1>

        {/* User Statistics Card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              User Statistics
            </CardTitle>
            <Badge variant="secondary" className="rounded-md">
              Updated monthly
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
            <p className="text-sm text-gray-500">
              <ArrowUp className="h-4 w-4 text-green-500 inline-block mr-1 align-text-top" />
              {newUserGrowth}% new users this month
            </p>
          </CardContent>
        </Card>

        {/* Sales, Spend, and Profit Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Financial Trends</CardTitle>
            <CardDescription>Monthly sales, advertising spend, and profit overview.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="sales" stroke="#82ca9d" fill="#c6f6d5" name="Sales" />
                <Area type="monotone" dataKey="spend" stroke="#8884d8" fill="#d0c9ff" name="Ad Spend" />
                <Area type="monotone" dataKey="profit" stroke="#ffc658" fill="#ffe5b3" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">$45,678</div>
              <p className="text-sm text-green-600 font-medium">
                <ArrowUp className="h-4 w-4 text-green-500 inline-block mr-1 align-text-top" />
                12% increase from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Advertising Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">$12,345</div>
              <p className="text-sm text-red-600 font-medium">
                <ArrowDown className="h-4 w-4 text-red-500 inline-block mr-1 align-text-top" />
                5% decrease from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">$33,333</div>
              <p className="text-sm text-green-600 font-medium">
                <ArrowUp className="h-4 w-4 text-green-500 inline-block mr-1 align-text-top" />
                15% increase from last month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className={`text-sm`} style={{ color: entry.color }}>
            {`${typeof entry.dataKey === 'string' ? entry.dataKey.charAt(0).toUpperCase() + entry.dataKey.slice(1) : entry.dataKey}: $${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default Trends;
