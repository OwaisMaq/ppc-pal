import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Wifi, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  endpoint: string;
  region: string;
  status: 'reachable' | 'unreachable';
  httpStatus?: number;
  responseTime?: number;
  reachable: boolean;
  expectedAuth?: boolean;
  error?: string;
  isDnsError?: boolean;
  isTimeoutError?: boolean;
}

interface DiagnosticAnalysis {
  timestamp: string;
  totalEndpoints: number;
  reachableEndpoints: number;
  unreachableEndpoints: number;
  dnsErrors: number;
  overallStatus: 'partial_success' | 'failed' | 'success';
  recommendation: string;
}

const AmazonConnectionDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [analysis, setAnalysis] = useState<DiagnosticAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setDiagnostics([]);
      setAnalysis(null);
      
      console.log('Running Amazon connection diagnostics...');
      
      const { data, error } = await supabase.functions.invoke('amazon-diagnostics');
      
      if (error) {
        console.error('Diagnostics error:', error);
        toast.error('Failed to run diagnostics');
        return;
      }
      
      if (data?.diagnostics) {
        setDiagnostics(data.diagnostics);
        setAnalysis(data.analysis);
        
        if (data.analysis.overallStatus === 'failed') {
          toast.error('All Amazon regions are unreachable');
        } else if (data.analysis.overallStatus === 'partial_success') {
          toast.warning('Some Amazon regions are unreachable');
        } else {
          toast.success('All Amazon regions are reachable');
        }
      }
      
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (result: DiagnosticResult) => {
    if (result.reachable) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (result.isDnsError) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (result.isTimeoutError) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (result: DiagnosticResult) => {
    if (result.reachable) {
      return <Badge className="bg-green-100 text-green-800">Reachable</Badge>;
    } else if (result.isDnsError) {
      return <Badge className="bg-red-100 text-red-800">DNS Error</Badge>;
    } else if (result.isTimeoutError) {
      return <Badge className="bg-orange-100 text-orange-800">Timeout</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Error</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Amazon Connection Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          {analysis && (
            <span className="text-sm text-gray-500">
              Last tested: {new Date(analysis.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {analysis && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Status:</strong> {analysis.recommendation}
              <br />
              <strong>Reachable regions:</strong> {analysis.reachableEndpoints} of {analysis.totalEndpoints}
              {analysis.dnsErrors > 0 && (
                <>
                  <br />
                  <strong>DNS errors:</strong> {analysis.dnsErrors} region(s) have DNS resolution issues
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Regional Endpoint Status</h4>
            {diagnostics.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result)}
                  <div>
                    <h5 className="font-medium">{result.region}</h5>
                    <p className="text-sm text-gray-500">
                      {result.endpoint}
                      {result.responseTime && (
                        <span className="ml-2">• {result.responseTime}ms</span>
                      )}
                      {result.httpStatus && (
                        <span className="ml-2">• HTTP {result.httpStatus}</span>
                      )}
                    </p>
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        {result.error.length > 100 ? result.error.substring(0, 100) + '...' : result.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(result)}
                </div>
              </div>
            ))}
          </div>
        )}

        {diagnostics.length === 0 && !loading && (
          <div className="text-center py-4 text-gray-500">
            Click "Test Connection" to check Amazon API connectivity
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmazonConnectionDiagnostics;