
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AmazonConnection } from "@/lib/amazon/types";

interface PerformanceEmptyStateProps {
  connections: AmazonConnection[];
  getFilteredDescription: () => string;
}

const PerformanceEmptyState = ({ connections, getFilteredDescription }: PerformanceEmptyStateProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Overview of your advertising performance metrics{getFilteredDescription()}
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {connections.length === 0 
            ? "No Amazon accounts connected yet. Connect your Amazon Ads account to view performance data."
            : "No campaign data available yet. Sync your Amazon account to import campaign data."
          }
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PerformanceEmptyState;
