import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useState } from "react";

interface WeeklyPerformanceChartProps {
  campaigns: any[];
  loading?: boolean;
}

const generateMockData = (campaigns: any[]) => {
  // Generate last 7 days of data
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Calculate daily metrics from campaigns (mock distribution)
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    
    // Simulate daily variance (60-140% of average)
    const variance = 0.6 + Math.random() * 0.8;
    const dailySpend = (totalSpend / 7) * variance;
    const dailySales = (totalSales / 7) * variance;
    const dailyClicks = Math.round((totalClicks / 7) * variance);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toISOString().split('T')[0],
      spend: Number(dailySpend.toFixed(2)),
      sales: Number(dailySales.toFixed(2)),
      clicks: dailyClicks,
      acos: dailySales > 0 ? Number(((dailySpend / dailySales) * 100).toFixed(2)) : 0,
      roas: dailySpend > 0 ? Number((dailySales / dailySpend).toFixed(2)) : 0,
    });
  }
  
  return data;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const WeeklyPerformanceChart = ({ campaigns, loading }: WeeklyPerformanceChartProps) => {
  const [activeChart, setActiveChart] = useState<'spend' | 'sales' | 'clicks'>('spend');
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!campaigns.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">No data available for chart visualization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = generateMockData(campaigns);

  const getChartConfig = () => {
    switch (activeChart) {
      case 'spend':
        return {
          dataKey: 'spend',
          color: '#3b82f6',
          formatter: formatCurrency,
          label: 'Spend',
        };
      case 'sales':
        return {
          dataKey: 'sales',
          color: '#10b981',
          formatter: formatCurrency,
          label: 'Sales',
        };
      case 'clicks':
        return {
          dataKey: 'clicks',
          color: '#f59e0b',
          formatter: formatNumber,
          label: 'Clicks',
        };
      default:
        return {
          dataKey: 'spend',
          color: '#3b82f6',
          formatter: formatCurrency,
          label: 'Spend',
        };
    }
  };

  const config = getChartConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeChart === 'spend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('spend')}
              className="h-8"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Spend
            </Button>
            <Button
              variant={activeChart === 'sales' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('sales')}
              className="h-8"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Sales
            </Button>
            <Button
              variant={activeChart === 'clicks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('clicks')}
              className="h-8"
            >
              Clicks
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'clicks' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={config.formatter}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-md">
                          <p className="font-medium">{label}</p>
                          <p style={{ color: config.color }}>
                            {config.label}: {config.formatter(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey={config.dataKey} 
                  fill={config.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={config.formatter}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-md">
                          <p className="font-medium">{label}</p>
                          <p style={{ color: config.color }}>
                            {config.label}: {config.formatter(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={config.dataKey} 
                  stroke={config.color}
                  strokeWidth={3}
                  dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: config.color, strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(chartData.reduce((sum, d) => sum + d.spend, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Spend</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(chartData.reduce((sum, d) => sum + d.sales, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Sales</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {formatNumber(chartData.reduce((sum, d) => sum + d.clicks, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Clicks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};