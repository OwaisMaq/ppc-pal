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
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> You must have an active Amazon Advertising account to use this integration.
            A regular Amazon seller account is not sufficient.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Connection Issues?</strong> If you're experiencing "Temporary connection issue" errors, 
            this is usually due to network connectivity problems with Amazon's servers. Try again in a few minutes, 
            or contact support if the issue persists.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Prerequisites:</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>
              <strong>Amazon Advertising Account:</strong> You must have an active Amazon Advertising account
              with campaigns, ad groups, and keywords set up.
            </li>
            <li>
              <strong>API Access:</strong> Your account must be eligible for Amazon Advertising API access.
              New accounts may need to wait 30+ days and have sufficient advertising spend.
            </li>
            <li>
              <strong>Permissions:</strong> When connecting, you'll be asked to grant the following permissions:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Campaign Management (to view and modify campaigns)</li>
                <li>Reporting (to access performance data)</li>
                <li>Profile Access (to identify your advertising profiles)</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Don't have an Amazon Advertising account?</h4>
          <p className="text-sm text-blue-800 mb-3">
            You'll need to create one through Amazon Seller Central or Amazon Vendor Central first.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => window.open('https://advertising.amazon.com/', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Learn About Amazon Advertising
          </Button>
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
            <strong>Troubleshooting:</strong> If you receive "No profiles found" after connecting,
            it usually means your account doesn't have Amazon Advertising API access or 
            insufficient permissions were granted during the OAuth flow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
export default AmazonOAuthSetup;