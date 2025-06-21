
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

const Reporting = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <PieChart className="h-8 w-8 text-blue-600" />
            Reporting
          </h1>
          <p className="text-gray-600">
            Generate comprehensive reports for your campaigns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Reports</CardTitle>
            <CardDescription>
              Create detailed reports and export your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Advanced reporting features coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Reporting;
