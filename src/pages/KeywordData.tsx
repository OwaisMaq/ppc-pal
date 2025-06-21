
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

const KeywordData = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            Keyword/Product Data
          </h1>
          <p className="text-gray-600">
            Manage and analyze your keyword and product performance data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Overview</CardTitle>
            <CardDescription>
              View your keyword and product performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Keyword and product data analysis coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default KeywordData;
