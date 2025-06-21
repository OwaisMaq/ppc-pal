
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from 'lucide-react';

const TrendsKeyMetrics = () => {
  return (
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
  );
};

export default TrendsKeyMetrics;
