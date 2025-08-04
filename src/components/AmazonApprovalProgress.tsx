import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock, AlertTriangle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'failed';
  estimatedTime?: string;
  actionRequired?: boolean;
}

interface AmazonApprovalProgressProps {
  connectionStatus?: string;
  lastError?: string;
}

const AmazonApprovalProgress = ({ connectionStatus = 'pending_approval', lastError }: AmazonApprovalProgressProps) => {
  const getStepsForStatus = (status: string): ApprovalStep[] => {
    const baseSteps: ApprovalStep[] = [
      {
        id: 'application-submitted',
        title: 'API Application Submitted',
        description: 'Your Amazon Advertising API access request has been submitted',
        status: 'completed',
        estimatedTime: 'Immediate'
      },
      {
        id: 'account-review',
        title: 'Account Eligibility Review',
        description: 'Amazon is reviewing your account history and advertising spend',
        status: status === 'pending_approval' ? 'in-progress' : status === 'approved' ? 'completed' : 'pending',
        estimatedTime: '1-3 business days'
      },
      {
        id: 'spend-verification',
        title: 'Spend History Verification',
        description: 'Verifying minimum spend thresholds and account standing',
        status: status === 'approved' ? 'completed' : status === 'pending_approval' ? 'in-progress' : 'pending',
        estimatedTime: '1-2 business days'
      },
      {
        id: 'api-access-granted',
        title: 'API Access Granted',
        description: 'Full access to Amazon Advertising API endpoints',
        status: status === 'approved' ? 'completed' : 'pending',
        estimatedTime: 'Upon approval'
      }
    ];

    if (status === 'rejected' || lastError) {
      baseSteps[1].status = 'failed';
      baseSteps[2].status = 'pending';
      baseSteps[3].status = 'pending';
    }

    return baseSteps;
  };

  const steps = getStepsForStatus(connectionStatus);
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending_approval':
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            API Approval Progress
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Track the status of your Amazon Advertising API access request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-600">{completedSteps} of {totalSteps} steps completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                {getStatusIcon(step.status)}
                {index < steps.length - 1 && (
                  <div className={`w-px h-8 mt-2 ${
                    step.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${
                    step.status === 'completed' ? 'text-green-700' : 
                    step.status === 'in-progress' ? 'text-blue-700' : 
                    step.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </h4>
                  {step.estimatedTime && step.status === 'in-progress' && (
                    <Badge variant="outline" className="text-xs">
                      {step.estimatedTime}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {connectionStatus === 'pending_approval' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Your application is under review.</strong> This typically takes 1-3 business days. 
              You'll receive an email notification once your API access is approved.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'rejected' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Application rejected.</strong> Your account may not meet the minimum requirements. 
              Common reasons include insufficient advertising spend or account age.
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://advertising.amazon.com/help/200663580', '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Learn about API requirements
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {lastError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Connection Error:</strong> {lastError}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AmazonApprovalProgress;