
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const Trends = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Trends
          </h1>
          <p className="text-gray-600">
            Analyze performance trends and identify patterns in your campaigns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Trends</CardTitle>
            <CardDescription>
              Track your campaign performance over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Trends analysis coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
