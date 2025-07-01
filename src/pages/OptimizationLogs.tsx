
import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Activity, TrendingUp, Zap } from 'lucide-react';

interface OptimizationLog {
  id: string;
  optimization_type: string;
  status: string;
  total_recommendations: number;
  total_keywords_analyzed: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const OptimizationLogs = () => {
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data since optimization_results table doesn't exist
    const mockLogs: OptimizationLog[] = [];
    setLogs(mockLogs);
    setLoading(false);
  }, []);

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Optimization Logs
          </h1>
          <p className="text-gray-600">
            View your optimization history and performance insights
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Optimization logs functionality is currently disabled as Amazon integration has been removed.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Optimizations
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No optimizations run yet
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Keywords Analyzed
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No keywords analyzed yet
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recommendations
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No recommendations generated yet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default OptimizationLogs;
