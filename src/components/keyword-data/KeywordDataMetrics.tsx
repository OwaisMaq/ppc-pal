
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';

const KeywordDataMetrics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Keyword Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          No metrics available - Amazon integration has been removed.
        </p>
      </CardContent>
    </Card>
  );
};

export default KeywordDataMetrics;
