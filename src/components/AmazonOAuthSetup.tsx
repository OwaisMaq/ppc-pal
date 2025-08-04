import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Settings, Copy, Clock, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AmazonReadinessCheck from "@/components/AmazonReadinessCheck";
import AmazonApprovalProgress from "@/components/AmazonApprovalProgress";
import AmazonSupportGuidance from "@/components/AmazonSupportGuidance";
interface AmazonOAuthSetupProps {
  connectionStatus?: string;
  showReadinessCheck?: boolean;
  showApprovalProgress?: boolean;
  errorType?: string;
}

const AmazonOAuthSetup = ({ 
  connectionStatus,
  showReadinessCheck = true,
  showApprovalProgress = false,
  errorType
}: AmazonOAuthSetupProps) => {
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
    <div className="space-y-6">
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

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Essential Requirements:</h4>
          
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
              <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-blue-900">Amazon Advertising Account</h5>
                <p className="text-sm text-blue-800">
                  You must have an <strong>active Amazon Advertising account</strong> (not just Seller Central).
                  This includes completed account setup with billing information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-amber-50 to-amber-100">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900">Account Age & Eligibility</h5>
                <p className="text-sm text-amber-800">
                  Your account must be <strong>at least 30 days old</strong> and have sufficient advertising activity.
                  Amazon reviews account history before granting API access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-green-50 to-green-100">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-green-900">Minimum Spend Threshold</h5>
                <p className="text-sm text-green-800">
                  <strong>$100+ total advertising spend</strong> is typically required for API access approval.
                  This demonstrates active use of Amazon's advertising platform.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-purple-100">
              <Target className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-purple-900">Active Campaigns</h5>
                <p className="text-sm text-purple-800">
                  You must have <strong>at least one active advertising campaign</strong> with keywords, 
                  ad groups, and products properly configured.
                </p>
              </div>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>OAuth Permissions:</strong> During connection, you'll grant permissions for:
              Campaign Management, Reporting Data Access, and Profile Information.
              All permissions are required for full functionality.
            </AlertDescription>
          </Alert>
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

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Common Issues:</strong> "No profiles found" errors typically indicate missing API access, 
            insufficient account activity, or incomplete advertising setup. Ensure all requirements above 
            are met before attempting to connect.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
    
    {showReadinessCheck && <AmazonReadinessCheck />}
    {showApprovalProgress && <AmazonApprovalProgress connectionStatus={connectionStatus} />}
    <AmazonSupportGuidance connectionStatus={connectionStatus} errorType={errorType} />
  </div>
  );
};
export default AmazonOAuthSetup;