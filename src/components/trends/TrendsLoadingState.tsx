
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Loader2 } from 'lucide-react';

const TrendsLoadingState = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Performance Trends</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default TrendsLoadingState;
