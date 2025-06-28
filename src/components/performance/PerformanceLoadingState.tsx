
import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceLoadingStateProps {
  getFilteredDescription: () => string;
}

const PerformanceLoadingState = ({ getFilteredDescription }: PerformanceLoadingStateProps) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Loading campaign performance metrics from Amazon API{getFilteredDescription()}...
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          <span>Loading your Amazon advertising performance data...</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceLoadingState;
