
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
  RefreshCw,
  Info,
  Lightbulb
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
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleStartSync = async () => {
    clearSteps();
    await runEnhancedSync(connectionId);
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  const hasErrors = steps.some(step => step.status === 'error');
  const hasWarnings = steps.some(step => step.status === 'warning');
  const lastStep = steps[steps.length - 1];
  const isComplete = !isRunning && steps.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-600" />
          Enhanced Amazon Sync
          {isRunning && (
            <Badge variant="secondary" className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Running
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Advanced multi-strategy sync with intelligent profile detection and error recovery
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Panel */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Connection: {connectionName}</h4>
            <p className="text-sm text-gray-600">
              Uses enhanced detection across multiple regions and strategies
            </p>
          </div>
          <div className="flex gap-2">
            {steps.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSteps}
                disabled={isRunning}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              onClick={handleStartSync}
              disabled={isRunning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Enhanced Sync...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Enhanced Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        {isComplete && (
          <Alert className={`border ${hasErrors ? 'border-red-200 bg-red-50' : hasWarnings ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className="flex items-center gap-2">
              {hasErrors ? (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">
                    Sync completed with errors. Review the steps below for guidance.
                  </span>
                </>
              ) : hasWarnings ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">
                    Sync completed with warnings. Some setup may be required.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">
                    Enhanced sync completed successfully!
                  </span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Steps */}
        {steps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Sync Progress & Details
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium truncate">{step.step}</h5>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatDistanceToNow(step.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      {step.details && (
                        <p className="text-sm mt-1 text-gray-600">{step.details}</p>
                      )}
                      {step.data && (
                        <div className="mt-2 text-xs">
                          <details className="cursor-pointer">
                            <summary className="text-gray-500 hover:text-gray-700">
                              View technical details
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(step.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help and Information */}
        {steps.length === 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">About Enhanced Sync</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Multi-Strategy Detection:</strong> Uses multiple methods to find advertising profiles</li>
              <li>• <strong>Regional Coverage:</strong> Checks North America, Europe, and Far East regions</li>
              <li>• <strong>Intelligent Recovery:</strong> Automatically fixes common profile configuration issues</li>
              <li>• <strong>Comprehensive Validation:</strong> Verifies tokens, permissions, and account setup</li>
              <li>• <strong>Detailed Guidance:</strong> Provides step-by-step instructions for any issues</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedAmazonSync;
