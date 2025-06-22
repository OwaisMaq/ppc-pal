
import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AmazonConnection } from '@/lib/amazon/types';

interface TrendsEmptyStateProps {
  connections: AmazonConnection[];
}

const TrendsEmptyState = ({ connections }: TrendsEmptyStateProps) => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Performance Trends</h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connections.length === 0 
              ? "No Amazon accounts connected yet. Connect your Amazon Ads account to view trend data."
              : "No campaign data available yet. Sync your Amazon account to import campaign data and view trends."
            }
          </AlertDescription>
        </Alert>
      </div>
    </AuthenticatedLayout>
  );
};

export default TrendsEmptyState;
