
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface OptimizationStatusProps {
  lastOptimizationRun: string;
}

const OptimizationStatus: React.FC<OptimizationStatusProps> = ({
  lastOptimizationRun,
}) => {
  return (
    <Card className="bg-gray-50">
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">
          Last automatic optimization: {new Date(lastOptimizationRun).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default OptimizationStatus;
