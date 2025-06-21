
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const OptimizationLogs = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Optimisation Logs
          </h1>
          <p className="text-gray-600">
            View detailed logs of all optimization activities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Optimizations</CardTitle>
            <CardDescription>
              Track all optimization changes and their impacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Optimization logs coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default OptimizationLogs;
