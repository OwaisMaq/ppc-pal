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
          <AlertTriangle className="h-5 w-5" />
          Amazon Developer Portal Setup Required
        </CardTitle>
        <CardDescription>
          Configure your Amazon app to allow connections from this domain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Error 400: Redirect URI not whitelisted</strong>
            <br />
            The current domain hasn't been added to your Amazon app's allowed redirect URLs.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-gray-900">Required Redirect URIs:</h4>
            <div className="space-y-2">
              {redirectUris.map((uri, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">{uri}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(uri)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <div className="flex-1">
                  Open{" "}
                  <a 
                    href="https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Amazon Developer Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>Click on your <strong>Login with Amazon</strong> app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>Navigate to the <strong>"Web Settings"</strong> tab</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">4.</span>
                <span>In the <strong>"Allowed Return URLs"</strong> section, add all the redirect URIs shown above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">5.</span>
                <span>Click <strong>"Save"</strong> to apply the changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">6.</span>
                <span>Wait 2-3 minutes for the changes to propagate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">7.</span>
                <span>Try connecting your Amazon account again</span>
              </li>
            </ol>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Settings className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Need Help?</strong> If you don't have access to the Amazon Developer Portal, 
              contact the person who created the Amazon app or your technical administrator.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

export default AmazonOAuthSetup;