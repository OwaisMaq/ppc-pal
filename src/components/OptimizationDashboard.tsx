
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import { useOptimizationDashboard } from "@/hooks/useOptimizationDashboard";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

const OptimizationDashboard = () => {
  const { connections } = useAmazonConnections();
  const { optimizations, loading, runOptimization, fetchOptimizations } = useOptimizationDashboard();
  const [selectedConnection, setSelectedConnection] = useState<string>('');

  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id);
    }
  }, [connections, selectedConnection]);

  useEffect(() => {
    if (selectedConnection) {
      fetchOptimizations(selectedConnection);
    }
  }, [selectedConnection]);

  const handleRunOptimization = async () => {
    if (selectedConnection) {
      await runOptimization(selectedConnection);
      await fetchOptimizations(selectedConnection);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeConnections = connections.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            AI Optimization Engine
          </CardTitle>
          <CardDescription>
            Run automated optimizations on your Amazon Advertising campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeConnections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Connect an Amazon account first to run optimizations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConnections.length > 1 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Account:</label>
                  <select
                    value={selectedConnection}
                    onChange={(e) => setSelectedConnection(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {activeConnections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.profile_name || `Profile ${connection.profile_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <Button
                onClick={handleRunOptimization}
                disabled={loading || !selectedConnection}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Optimization...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run AI Optimization
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Optimization History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizations.map((optimization) => (
                <div key={optimization.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(optimization.status)}
                    <div>
                      <h4 className="font-medium">
                        {optimization.optimization_type.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {optimization.total_keywords_analyzed > 0 && (
                          <span>{optimization.total_keywords_analyzed} keywords analyzed • </span>
                        )}
                        {optimization.total_recommendations > 0 && (
                          <span>{optimization.total_recommendations} recommendations • </span>
                        )}
                        {formatDistanceToNow(new Date(optimization.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(optimization.status)}>
                      {optimization.status.replace('_', ' ')}
                    </Badge>
                    {optimization.estimated_impact_sales && (
                      <Badge variant="outline" className="text-green-600">
                        +${optimization.estimated_impact_sales.toFixed(0)} est. sales
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptimizationDashboard;
