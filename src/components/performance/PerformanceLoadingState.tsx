
import React from 'react';
import { Loader2 } from "lucide-react";

interface PerformanceLoadingStateProps {
  getFilteredDescription: () => string;
}

const PerformanceLoadingState = ({ getFilteredDescription }: PerformanceLoadingStateProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">Loading your advertising performance metrics...</p>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    </div>
  );
};

export default PerformanceLoadingState;
