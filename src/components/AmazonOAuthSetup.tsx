import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Settings, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
const AmazonOAuthSetup = () => {
  const currentDomain = window.location.origin;
  const redirectUri = `${currentDomain}/auth/amazon/callback`;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  const redirectUris = [
    `${currentDomain}/auth/amazon/callback`, 
    'https://ppcpal.online/auth/amazon/callback', 
    'http://localhost:3000/auth/amazon/callback'
  ];

  return (
    <Card className="mt-6 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Settings className="h-5 w-5" />
          Amazon Advertising Account Requirements
        </CardTitle>
        <CardDescription>
          Before connecting your Amazon account, please ensure you meet these requirements:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Requirements:</strong> This integration requires Amazon Advertising API access, which has specific prerequisites:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your application must be registered and approved by Amazon for Advertising API access</li>
              <li>You must have an active Amazon Advertising account (not just a seller account)</li>
              <li>Your account must be eligible for API access (typically requires 30+ days and sufficient ad spend)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">What you need:</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>Amazon Advertising Account:</strong> An active advertising account with campaigns and sufficient spend history (typically 30+ days).
            </li>
            <li>
              <strong>Application Registration:</strong> Your application must be registered and approved by Amazon through their Developer Console. This is a separate process from regular Amazon authentication.
            </li>
            <li>
              <strong>API Approval:</strong> Amazon must explicitly grant your application access to the Advertising API. This typically requires:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Business justification for API access</li>
                <li>Demonstration of legitimate advertising use case</li>
                <li>Compliance with Amazon's API terms</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-900 mb-2">⚠️ API Registration Required</h4>
          <p className="text-sm text-orange-800 mb-3">
            To use this integration, the application developer must register with Amazon and get approval for Advertising API access. This cannot be done by end users - it's a developer/business registration process.
          </p>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-orange-300 text-orange-700 hover:bg-orange-100 mr-2"
              onClick={() => window.open('https://developer.amazon.com/apps-and-games/console', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Amazon Developer Console
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => window.open('https://advertising.amazon.com/API/docs/en-us/guides/onboarding', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              API Onboarding Guide
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Technical Setup Information</h4>
          <p className="text-sm text-gray-600 mb-3">
            If you're setting up your own Amazon API application, use these redirect URIs:
          </p>
          <div className="space-y-2">
            {redirectUris.map((uri, index) => (
              <div key={index} className="flex items-center justify-between bg-white border rounded p-2">
                <code className="text-xs text-gray-800 break-all">{uri}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(uri)}
                  className="ml-2 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Failed?</strong> The "Connection Failed" error typically means:
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Your application is not registered for Amazon Advertising API access</li>
              <li>Your Amazon account doesn't have an active Advertising account</li>
              <li>Your account is not eligible for API access (need 30+ days + sufficient spend)</li>
              <li>The API credentials are not properly configured</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
export default AmazonOAuthSetup;