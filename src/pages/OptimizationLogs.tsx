
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Loader2, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import FilterBar from '@/components/FilterBar';

interface OptimizationLog {
  id: string;
  optimization_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_recommendations: number;
  total_keywords_analyzed: number;
  estimated_impact_sales: number;
  estimated_impact_spend: number;
  created_at: string;
  completed_at: string;
  error_message?: string;
}

const OptimizationLogs = () => {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: optimizationLogs, isLoading, error } = useQuery({
    queryKey: ['optimization-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('optimization_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OptimizationLog[];
    },
    enabled: !!user,
  });

  const filteredLogs = React.useMemo(() => {
    if (!optimizationLogs) return [];
    
    return optimizationLogs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [optimizationLogs, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Optimization Logs</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Optimization Logs</h1>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load optimization logs. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Optimization Logs</h1>
            <p className="text-gray-600 mt-2">
              Track all optimization runs and their results
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Run Optimization
          </Button>
        </div>

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLogs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No optimization logs found. Run your first optimization to see results here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <CardTitle className="text-lg">
                          {log.optimization_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Optimization
                        </CardTitle>
                        <CardDescription>
                          Started {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Keywords Analyzed</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {log.total_keywords_analyzed?.toLocaleString() || '0'}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Recommendations</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {log.total_recommendations?.toLocaleString() || '0'}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Est. Sales Impact</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        ${log.estimated_impact_sales?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Est. Spend Impact</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        ${log.estimated_impact_spend?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  
                  {log.error_message && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Error:</strong> {log.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {log.completed_at && (
                    <p className="text-sm text-gray-600 mt-4">
                      Completed on {new Date(log.completed_at).toLocaleDateString()} at {new Date(log.completed_at).toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default OptimizationLogs;
