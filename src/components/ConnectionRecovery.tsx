
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2,
  ExternalLink,
  Lightbulb
} from "lucide-react";
import { useEnhancedAmazonSync } from "@/hooks/useEnhancedAmazonSync";

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
  const { runConnectionRecovery, isRunning } = useEnhancedAmazonSync();

  const handleRecovery = async () => {
    const result = await runConnectionRecovery(connectionId);
    if (result.success && onRecoveryComplete) {
      onRecoveryComplete();
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
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRecovery}
              disabled={isRunning}
              className="bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Detecting Profiles...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Auto-Fix Connection
                </>
              )}
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

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Auto-Fix:</strong> Attempts to detect and configure your advertising profiles automatically.</p>
            <p><strong>Manual Setup:</strong> Create campaigns at advertising.amazon.com, then try Auto-Fix.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionRecovery;
