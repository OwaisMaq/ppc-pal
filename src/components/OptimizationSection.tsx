
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvertisingData } from '@/types/common';
import { Zap, Settings, TrendingUp } from 'lucide-react';

interface OptimizationSectionProps {
  data: AdvertisingData | null;
}

const OptimizationSection = ({ data }: OptimizationSectionProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Smart Optimization
          </CardTitle>
          <CardDescription>
            AI-powered recommendations to improve your campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Budget Optimization</h4>
                <Badge variant="secondary">High Impact</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Reallocate budget to high-performing campaigns
              </p>
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Keyword Bidding</h4>
                <Badge variant="secondary">Medium Impact</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Adjust bids based on performance data
              </p>
              <Button size="sm" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Optimize
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Ad Schedule</h4>
                <Badge variant="outline">Low Impact</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Optimize ad timing for better performance
              </p>
              <Button size="sm" variant="outline">
                Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizationSection;
