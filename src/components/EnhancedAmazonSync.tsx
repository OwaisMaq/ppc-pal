
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
  Zap,
  RefreshCw
} from "lucide-react";
import { useEnhancedAmazonSync } from "@/hooks/useEnhancedAmazonSync";
import { formatDistanceToNow } from 'date-fns';

interface EnhancedAmazonSyncProps {
  connectionId: string;
  connectionName?: string;
  onSyncComplete?: () => void;
}

const EnhancedAmazonSync = ({ 
  connectionId, 
  connectionName = 'Amazon Connection',
  onSyncComplete 
}: EnhancedAmazonSyncProps) => {
  const { steps, isRunning, runEnhancedSync, clearSteps } = useEnhancedAmazonSync();

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

  const handleRunSync = async () => {
    await runEnhancedSync(connectionId);
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Enhanced Amazon Sync - {connectionName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This enhanced sync process will attempt multiple strategies to detect your Amazon Advertising profiles
            and resolve connection issues. It includes detailed diagnostics and recovery options.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleRunSync}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Enhanced Sync...' : 'Start Enhanced Sync'}
          </Button>
          
          {steps.length > 0 && (
            <Button 
              onClick={clearSteps}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Results
            </Button>
          )}
        </div>

        {steps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Enhanced Sync Progress:</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {steps.map((step, index) => (
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
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(step.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      
                      {step.details && (
                        <p className="text-sm text-gray-600 mb-2">{step.details}</p>
                      )}
                      
                      {step.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            View technical details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto text-xs">
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

        {steps.length > 0 && !isRunning && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Review the sync results above for any issues or errors</li>
              <li>If profiles were found, your connection should now be ready for regular syncing</li>
              <li>If no profiles were found, you may need to set up Amazon Advertising first</li>
              <li>Visit advertising.amazon.com to create your first advertising campaign</li>
              <li>Contact support if issues persist after completing Amazon Advertising setup</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedAmazonSync;
