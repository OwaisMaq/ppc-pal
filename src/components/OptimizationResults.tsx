
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvertisingData } from '@/types/common';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface OptimizationResultsProps {
  data: AdvertisingData | null;
}

const OptimizationResults = ({ data }: OptimizationResultsProps) => {
  const mockResults = [
    {
      id: '1',
      type: 'Budget Increase',
      campaign: 'Summer Sale',
      impact: '+15%',
      metric: 'ROAS',
      status: 'Applied',
      trend: 'up'
    },
    {
      id: '2',
      type: 'Keyword Bid Adjustment',
      campaign: 'Brand Campaign',
      impact: '-8%',
      metric: 'ACoS',
      status: 'Pending',
      trend: 'down'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimization Results</CardTitle>
        <CardDescription>
          Performance improvements from recent optimizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockResults.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${
                  result.trend === 'up' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{result.type}</h4>
                  <p className="text-sm text-gray-600">{result.campaign}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`font-medium ${
                    result.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.impact} {result.metric}
                  </div>
                  <Badge variant={result.status === 'Applied' ? 'default' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizationResults;
