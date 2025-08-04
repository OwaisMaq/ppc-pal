import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Shield } from "lucide-react";

interface ReadinessItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  checked: boolean;
  helpUrl?: string;
}

const AmazonReadinessCheck = () => {
  const [readinessItems, setReadinessItems] = useState<ReadinessItem[]>([
    {
      id: 'advertising-account',
      title: 'Active Amazon Advertising Account',
      description: 'You have an active Amazon Advertising account (not just Seller Central)',
      required: true,
      checked: false,
      helpUrl: 'https://advertising.amazon.com/'
    },
    {
      id: 'api-eligibility',
      title: 'API Access Eligibility',
      description: 'Your account is at least 30 days old with sufficient advertising spend',
      required: true,
      checked: false
    },
    {
      id: 'campaigns-active',
      title: 'Active Campaigns',
      description: 'You have at least one active advertising campaign',
      required: true,
      checked: false
    },
    {
      id: 'permissions-admin',
      title: 'Account Admin Permissions',
      description: 'You have admin-level access to the advertising account',
      required: true,
      checked: false
    },
    {
      id: 'billing-current',
      title: 'Current Billing Information',
      description: 'Your billing information is up to date and account is in good standing',
      required: true,
      checked: false
    },
    {
      id: 'spend-threshold',
      title: 'Minimum Spend History',
      description: 'Account has at least $100+ in total advertising spend (recommended)',
      required: false,
      checked: false
    }
  ]);

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setReadinessItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, checked } : item
      )
    );
  };

  const requiredItems = readinessItems.filter(item => item.required);
  const checkedRequiredItems = requiredItems.filter(item => item.checked);
  const isReady = checkedRequiredItems.length === requiredItems.length;
  const readinessScore = Math.round((checkedRequiredItems.length / requiredItems.length) * 100);

  const getReadinessStatus = () => {
    if (readinessScore === 100) return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (readinessScore >= 80) return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const status = getReadinessStatus();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Account Readiness Check
        </CardTitle>
        <CardDescription>
          Verify your Amazon Advertising account meets the requirements for API integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`p-4 rounded-lg ${status.bg} ${status.border} border`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isReady ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : readinessScore >= 80 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-semibold ${status.color}`}>
                Readiness Score: {readinessScore}%
              </span>
            </div>
            <Badge variant={isReady ? "default" : "secondary"}>
              {isReady ? 'Ready to Connect' : 'Action Required'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Requirements Checklist:</h4>
          {readinessItems.map((item) => (
            <div key={item.id} className="flex items-start space-x-3">
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={item.id}
                    className={`text-sm font-medium cursor-pointer ${
                      item.checked ? 'text-green-700' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </label>
                  {item.required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {item.helpUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-blue-600"
                      onClick={() => window.open(item.helpUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {!isReady && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Ensure all required items are checked before attempting to connect. 
              Incomplete setups may result in "No profiles found" errors or connection failures.
            </AlertDescription>
          </Alert>
        )}

        {isReady && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Great!</strong> Your account appears ready for Amazon API integration. 
              You can now proceed with connecting your Amazon account.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AmazonReadinessCheck;