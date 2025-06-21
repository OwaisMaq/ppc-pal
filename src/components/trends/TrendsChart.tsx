
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
import CustomTooltip from './CustomTooltip';

interface TrendData {
  name: string;
  sales: number;
  spend: number;
  profit: number;
}

interface TrendsChartProps {
  data: TrendData[];
}

const TrendsChart = ({ data }: TrendsChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Financial Trends</CardTitle>
        <CardDescription>Monthly sales, advertising spend, and profit overview.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
  );
};

export default TrendsChart;
