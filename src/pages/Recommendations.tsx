
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

const Recommendations = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-blue-600" />
            Recommendations
          </h1>
          <p className="text-gray-600">
            AI-powered recommendations to optimize your campaigns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>
              Personalized suggestions to improve your campaign performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              AI recommendations coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default Recommendations;
