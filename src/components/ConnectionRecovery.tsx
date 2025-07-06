
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Bug,
  Zap
} from "lucide-react";
import { useEnhancedAmazonSync } from "@/hooks/useEnhancedAmazonSync";
import { useToast } from "@/hooks/use-toast";

interface ConnectionRecoveryProps {
  connectionId: string;
  connectionName?: string;
  profileId?: string;
  onRecoveryComplete?: () => void;
}

const ConnectionRecovery = ({ 
  connectionId, 
  connectionName = 'Amazon Connection',
  profileId,
  onRecoveryComplete 
}: ConnectionRecoveryProps) => {
  const { runConnectionRecovery, runEnhancedProfileDetection, debugConnection, isRunning } = useEnhancedAmazonSync();
  const { toast } = useToast();

  const handleRecovery = async () => {
    console.log('=== Connection Recovery Started ===');
    console.log('Connection ID:', connectionId);
    console.log('Connection Name:', connectionName);
    console.log('Profile ID:', profileId);
    
    try {
      const result = await runConnectionRecovery(connectionId);
      console.log('Recovery result:', result);
      
      if (result.success && onRecoveryComplete) {
        toast({
          title: "Recovery Successful",
          description: `Successfully configured ${result.profilesFound} profile${result.profilesFound === 1 ? '' : 's'}`,
        });
        onRecoveryComplete();
      } else if (result.requiresReconnection) {
        toast({
          title: "Reconnection Required",
          description: "Please reconnect your Amazon account to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setup Required",
          description: result.guidance || "Complete Amazon Advertising setup at advertising.amazon.com",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Recovery error:', error);
      toast({
        title: "Recovery Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDebugTest = async () => {
    console.log('=== Debug Test Started ===');
    console.log('Running comprehensive connection debug...');
    
    try {
      const result = await debugConnection(connectionId);
      console.log('Debug test result:', result);
      
      if (result.success) {
        toast({
          title: "Debug Complete",
          description: "Check console for comprehensive connection analysis.",
        });
      } else {
        toast({
          title: "Debug Failed",
          description: result.error || "Unknown debug error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Debug test error:', error);
      toast({
        title: "Debug Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleProfileDetectionTest = async () => {
    console.log('=== Profile Detection Test Started ===');
    
    try {
      const result = await runEnhancedProfileDetection(connectionId);
      console.log('Profile detection test result:', result);
      
      toast({
        title: "Profile Detection Test Complete",
        description: `Found ${result.profiles?.length || 0} profiles. Check console for details.`,
      });
    } catch (error) {
      console.error('Profile detection test error:', error);
      toast({
        title: "Profile Detection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isInvalidProfile = !profileId || 
                          profileId === 'setup_required_no_profiles_found' ||
                          profileId.includes('error');

  if (!isInvalidProfile) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Connection Needs Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>{connectionName}</strong> needs profile configuration to sync campaigns properly.
            <br />
            <span className="text-sm">Profile ID: {profileId || 'None'}</span>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="p-3 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-2">What's the issue?</h4>
            <p className="text-sm text-gray-600">
              Your Amazon connection doesn't have a valid advertising profile configured. 
              This usually happens when:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Amazon Advertising account setup is incomplete</li>
              <li>• No advertising campaigns have been created yet</li>
              <li>• Profile detection failed during initial connection</li>
              <li>• Token permissions are insufficient for advertising API</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleRecovery}
              disabled={isRunning}
              className="bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Recovery...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Auto-Fix Connection
                </>
              )}
            </Button>

            <Button
              onClick={handleDebugTest}
              disabled={isRunning}
              variant="outline"
              size="sm"
              className="border-orange-300"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Analysis
            </Button>

            <Button
              onClick={handleProfileDetectionTest}
              disabled={isRunning}
              variant="outline"
              size="sm"
              className="border-orange-300"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Profile Detection
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href="https://advertising.amazon.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Amazon Advertising
              </a>
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1 bg-white p-3 rounded border">
            <p><strong>Auto-Fix:</strong> Comprehensive recovery with multi-region detection and validation.</p>
            <p><strong>Debug Analysis:</strong> Complete connection analysis with token validation and logging.</p>
            <p><strong>Profile Detection:</strong> Tests the enhanced profile detection directly.</p>
            <p><strong>Manual Setup:</strong> Create campaigns at advertising.amazon.com, then try Auto-Fix.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionRecovery;
