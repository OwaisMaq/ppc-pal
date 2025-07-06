
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  Clock
} from 'lucide-react';

interface AmazonSetupGuideProps {
  onRetryConnection: () => void;
  connectionStatus?: string;
  setupReason?: string;
}

const AmazonSetupGuide = ({ 
  onRetryConnection, 
  connectionStatus = 'setup_required',
  setupReason = 'no_advertising_profiles' 
}: AmazonSetupGuideProps) => {
  
  const setupSteps = [
    {
      title: "Create Amazon Advertising Account",
      description: "Sign up for Amazon Advertising if you haven't already",
      action: "Visit advertising.amazon.com",
      url: "https://advertising.amazon.com",
      icon: <ExternalLink className="h-4 w-4" />,
      status: "required"
    },
    {
      title: "Set Up Your First Campaign",
      description: "Create at least one advertising campaign (Sponsored Products, Brands, or Display)",
      action: "Create a campaign",
      url: "https://advertising.amazon.com/campaign-manager",
      icon: <ArrowRight className="h-4 w-4" />,
      status: "required"
    },
    {
      title: "Verify Account Access",
      description: "Ensure your account has API access permissions",
      action: "Check account status",
      url: "https://advertising.amazon.com/account-settings",
      icon: <CheckCircle className="h-4 w-4" />,
      status: "recommended"
    },
    {
      title: "Wait for Account Activation",
      description: "New advertising accounts may take 24-48 hours to become fully active for API access",
      action: "Wait and retry",
      icon: <Clock className="h-4 w-4" />,
      status: "note"
    }
  ];

  const getStatusMessage = () => {
    switch (setupReason) {
      case 'no_advertising_profiles':
        return {
          title: "No Advertising Profiles Found",
          description: "Your Amazon account is connected, but we couldn't find any advertising profiles. This usually means Amazon Advertising hasn't been set up yet.",
          type: "warning" as const
        };
      case 'token_expired':
        return {
          title: "Connection Expired",
          description: "Your Amazon connection has expired and needs to be renewed.",
          type: "error" as const
        };
      case 'connection_error':
        return {
          title: "Connection Issue",
          description: "There was a technical issue connecting to your Amazon account.",
          type: "error" as const
        };
      default:
        return {
          title: "Setup Required",
          description: "Additional setup is needed to complete your Amazon Advertising connection.",
          type: "info" as const
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="space-y-6">
      <Alert variant={statusMessage.type === 'error' ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div>
            <strong>{statusMessage.title}</strong>
            <p className="mt-1">{statusMessage.description}</p>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png" 
              alt="Amazon" 
              className="h-5 w-auto"
            />
            Amazon Advertising Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Follow these steps to set up Amazon Advertising and enable campaign syncing:
          </p>
          
          <div className="space-y-4">
            {setupSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  {step.url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.open(step.url, '_blank')}
                    >
                      {step.action}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {step.status === 'required' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                  {step.status === 'recommended' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Recommended
                    </span>
                  )}
                  {step.status === 'note' && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Note
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> After completing the setup on Amazon, use the "Force Sync" 
              button to attempt profile detection again. New advertising accounts may take up to 
              48 hours to become available for API access.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-4">
            <Button onClick={onRetryConnection} variant="outline">
              Try Connection Again
            </Button>
            <Button 
              onClick={() => window.open('https://advertising.amazon.com', '_blank')}
              className="flex items-center gap-2"
            >
              Go to Amazon Advertising
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonSetupGuide;
