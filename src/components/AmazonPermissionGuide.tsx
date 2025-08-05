import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

interface AmazonPermissionGuideProps {
  connectionId?: string;
  healthIssues?: string[];
  onHealthCheck?: (connectionId: string) => void;
}

const AmazonPermissionGuide = ({ connectionId, healthIssues = [], onHealthCheck }: AmazonPermissionGuideProps) => {
  const hasPermissionIssues = healthIssues.some(issue => 
    issue.includes('403') || 
    issue.includes('permission') || 
    issue.includes('unauthorized')
  );

  const hasTokenIssues = healthIssues.some(issue => 
    issue.includes('token') || 
    issue.includes('expired') || 
    issue.includes('401')
  );

  const steps = [
    {
      title: "Access Amazon Advertising Console",
      description: "Log into your Amazon Advertising account and navigate to the API section",
      status: "pending" as const,
      action: {
        label: "Open Amazon Advertising Console",
        url: "https://advertising.amazon.com/API/docs/en-us/get-started/overview"
      }
    },
    {
      title: "Verify API Access Status",
      description: "Check that your account has API access enabled and approved",
      status: hasPermissionIssues ? "error" : "pending" as const,
      details: hasPermissionIssues ? "403 Permission errors detected - API access may not be approved" : undefined
    },
    {
      title: "Campaign Management Permissions",
      description: "Ensure your account has permissions to view and manage campaigns",
      status: hasPermissionIssues ? "error" : "pending" as const,
      details: "Required permissions: View campaigns, View ad groups, View keywords, Access reporting data"
    },
    {
      title: "Token Validation",
      description: "Verify that your access tokens are valid and not expired",
      status: hasTokenIssues ? "error" : "pending" as const,
      details: hasTokenIssues ? "Token issues detected - refresh may be required" : undefined
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "error":
        return "destructive";
      case "success":
        return "default";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Amazon API Permission Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(hasPermissionIssues || hasTokenIssues) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {hasPermissionIssues && "API permission issues detected. "}
              {hasTokenIssues && "Token validation issues detected. "}
              Please follow the steps below to resolve these issues.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-grow space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{step.title}</h4>
                  <Badge variant={getStatusColor(step.status)}>
                    {step.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                {step.details && (
                  <p className="text-sm text-destructive">
                    {step.details}
                  </p>
                )}
                {step.action && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(step.action!.url, '_blank')}
                    className="flex items-center gap-2"
                  >
                    {step.action.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {connectionId && onHealthCheck && (
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={() => onHealthCheck(connectionId)}
              variant="outline"
              size="sm"
            >
              Run Health Check
            </Button>
            <Button 
              onClick={() => window.open('https://advertising.amazon.com/API/docs/en-us/get-started/overview', '_blank')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Amazon API Documentation
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Alert>
          <AlertDescription>
            <strong>Common Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Amazon Advertising account with active campaigns</li>
              <li>API access approval from Amazon (can take 1-2 business days)</li>
              <li>Seller or Vendor account with valid payment method</li>
              <li>Account must have spent advertising budget in the last 60 days</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AmazonPermissionGuide;