
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

const PerformanceSummary = () => {
  const mockMetrics = [
    {
      title: 'Total Revenue',
      value: '$12,450',
      change: '+8.2%',
      trend: 'up',
      icon: DollarSign
    },
    {
      title: 'Ad Spend',
      value: '$3,240',
      change: '+12.1%',
      trend: 'up',
      icon: Target
    },
    {
      title: 'ROAS',
      value: '3.84',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      title: 'Conversion Rate',
      value: '4.2%',
      change: '+0.8%',
      trend: 'up',
      icon: Target
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">Overview of your campaign performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-2 mt-1">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Performance</CardTitle>
          <CardDescription>Campaign performance over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Summer Sale Campaign</h4>
                <p className="text-sm text-gray-600">High performing campaign</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">$4,250</div>
                <Badge variant="secondary">+15% ROAS</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Brand Awareness</h4>
                <p className="text-sm text-gray-600">Building brand recognition</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">$1,890</div>
                <Badge variant="outline">2.8 ROAS</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceSummary;
