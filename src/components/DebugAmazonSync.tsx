
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  Trash2,
  Bug
} from "lucide-react";
import { useDebugAmazonSync } from "@/hooks/useDebugAmazonSync";

const DebugAmazonSync = () => {
  const { debugSteps, isDebugging, runDebugSync, clearDebugSteps } = useDebugAmazonSync();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Amazon API Debug Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will test your Amazon API connections and identify exactly where the sync process is failing.
            Check the browser console for detailed logs during the process.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={runDebugSync}
            disabled={isDebugging}
            className="flex items-center gap-2"
          >
            {isDebugging ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isDebugging ? 'Running Debug...' : 'Start Debug Sync'}
          </Button>
          
          {debugSteps.length > 0 && (
            <Button 
              onClick={clearDebugSteps}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Results
            </Button>
          )}
        </div>

        {debugSteps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Debug Results:</h3>
            <div className="space-y-2">
              {debugSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{step.step}</span>
                        <Badge 
                          variant={step.status === 'success' ? 'default' : 
                                  step.status === 'error' ? 'destructive' : 
                                  step.status === 'warning' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {step.status}
                        </Badge>
                      </div>
                      
                      {step.details && (
                        <p className="text-sm text-gray-600 mb-2">{step.details}</p>
                      )}
                      
                      {step.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            View raw data
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {debugSteps.length > 0 && !isDebugging && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Check the browser console for detailed API call logs</li>
              <li>Look for any errors in the sync process above</li>
              <li>If connections show as active but no campaigns found, check your Amazon Ads account directly</li>
              <li>Verify the profile IDs match between your connections and Amazon account</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugAmazonSync;
