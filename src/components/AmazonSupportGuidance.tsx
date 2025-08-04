import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  ExternalLink, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Mail,
  FileText,
  Shield
} from "lucide-react";

interface SupportGuidanceProps {
  connectionStatus?: string;
  errorType?: string;
}

const AmazonSupportGuidance = ({ connectionStatus, errorType }: SupportGuidanceProps) => {
  const commonIssues = [
    {
      title: '"No profiles found" Error',
      description: 'Your Amazon account connected but no advertising profiles were detected.',
      causes: [
        'Account doesn\'t have Amazon Advertising API access',
        'No advertising campaigns have been created',
        'Insufficient permissions were granted during OAuth',
        'Account is too new (less than 30 days old)'
      ],
      solutions: [
        'Ensure you have an active Amazon Advertising account (not just Seller Central)',
        'Create at least one advertising campaign before connecting',
        'Wait 30+ days after account creation for API eligibility',
        'Contact Amazon Advertising support to verify API access'
      ]
    },
    {
      title: 'Token Expired or Invalid',
      description: 'Your connection was successful but tokens are no longer valid.',
      causes: [
        'Tokens automatically expire after 60 days',
        'Account permissions were revoked',
        'Amazon account password was changed'
      ],
      solutions: [
        'Use the "Refresh" button to renew your connection',
        'Reconnect your account if refresh fails',
        'Ensure your Amazon account remains in good standing'
      ]
    },
    {
      title: 'Connection Timeout or Failed',
      description: 'Unable to establish initial connection to Amazon.',
      causes: [
        'Network connectivity issues',
        'Amazon API temporary unavailability',
        'Incorrect redirect URI configuration'
      ],
      solutions: [
        'Try connecting again after a few minutes',
        'Check your internet connection',
        'Clear browser cache and cookies',
        'Try using a different browser'
      ]
    }
  ];

  const getStatusSpecificGuidance = () => {
    switch (connectionStatus) {
      case 'pending_approval':
        return {
          title: 'Waiting for API Approval',
          description: 'Your account is under review for Amazon Advertising API access.',
          timeline: '1-3 business days',
          actions: [
            'Check your email for approval notifications',
            'Ensure your Amazon Advertising account remains active',
            'Verify billing information is current'
          ]
        };
      case 'rejected':
        return {
          title: 'API Access Rejected',
          description: 'Your application for API access was not approved.',
          timeline: 'Immediate action required',
          actions: [
            'Review minimum spend requirements ($100+ total)',
            'Ensure account is at least 30 days old',
            'Contact Amazon Advertising support for clarification',
            'Consider increasing advertising spend before reapplying'
          ]
        };
      case 'setup_required':
        return {
          title: 'Account Setup Required',
          description: 'Your Amazon account needs additional configuration.',
          timeline: 'Can be resolved immediately',
          actions: [
            'Complete your Amazon Advertising account setup',
            'Create at least one active campaign',
            'Ensure billing information is complete',
            'Verify account permissions and roles'
          ]
        };
      default:
        return null;
    }
  };

  const statusGuidance = getStatusSpecificGuidance();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          Help & Support
        </CardTitle>
        <CardDescription>
          Get help with Amazon API integration issues and requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="guidance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guidance">Guidance</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
          </TabsList>

          <TabsContent value="guidance" className="space-y-4">
            {statusGuidance && (
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-blue-800">{statusGuidance.title}</strong>
                      <Badge variant="outline">{statusGuidance.timeline}</Badge>
                    </div>
                    <p className="text-blue-700">{statusGuidance.description}</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      {statusGuidance.actions.map((action, index) => (
                        <li key={index} className="text-sm">{action}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold">Amazon API Requirements Summary:</h4>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium">Account Eligibility</h5>
                    <p className="text-sm text-gray-600">Active Amazon Advertising account with 30+ days history</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium">Minimum Spend</h5>
                    <p className="text-sm text-gray-600">$100+ total advertising spend (recommended)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium">Active Campaigns</h5>
                    <p className="text-sm text-gray-600">At least one active advertising campaign</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4">
            <div className="space-y-4">
              {commonIssues.map((issue, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{issue.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-red-700 mb-2">Common Causes:</h5>
                      <ul className="text-sm space-y-1">
                        {issue.causes.map((cause, causeIndex) => (
                          <li key={causeIndex} className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                            <span className="text-gray-700">{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-green-700 mb-2">Solutions:</h5>
                      <ul className="text-sm space-y-1">
                        {issue.solutions.map((solution, solutionIndex) => (
                          <li key={solutionIndex} className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                            <span className="text-gray-700">{solution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  For account-specific issues, you may need to contact Amazon Advertising support directly.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Amazon Advertising Help Center</h4>
                      <p className="text-sm text-gray-600">General API documentation and requirements</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://advertising.amazon.com/help/', '_blank')}
                  >
                    Visit
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Amazon Advertising Support</h4>
                      <p className="text-sm text-gray-600">Direct support for API access issues</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://advertising.amazon.com/contact-us/', '_blank')}
                  >
                    Contact
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">API Documentation</h4>
                      <p className="text-sm text-gray-600">Technical documentation and integration guides</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://advertising.amazon.com/API/docs/', '_blank')}
                  >
                    View Docs
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AmazonSupportGuidance;