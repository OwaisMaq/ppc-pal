import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Clock,
  Shield,
  Key
} from "lucide-react";

interface ErrorDetail {
  code: string;
  message: string;
  type: 'permission' | 'token' | 'api' | 'network' | 'unknown';
  severity: 'error' | 'warning' | 'info';
  resolution?: string;
  actionUrl?: string;
  retryable?: boolean;
}

interface EnhancedErrorHandlingProps {
  error: any;
  onRetry?: () => void;
  context?: string;
}

const EnhancedErrorHandling = ({ error, onRetry, context }: EnhancedErrorHandlingProps) => {
  const parseError = (error: any): ErrorDetail => {
    // Handle 403 Permission Errors
    if (error?.message?.includes('403') || error?.status === 403) {
      return {
        code: 'AMAZON_INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access Amazon Advertising API',
        type: 'permission',
        severity: 'error',
        resolution: 'Your Amazon Advertising account needs API access approval. This process can take 1-2 business days.',
        actionUrl: 'https://advertising.amazon.com/API/docs/en-us/get-started/overview',
        retryable: false
      };
    }

    // Handle 401 Token Errors
    if (error?.message?.includes('401') || error?.status === 401) {
      return {
        code: 'AMAZON_TOKEN_INVALID',
        message: 'Access token is invalid or expired',
        type: 'token',
        severity: 'error',
        resolution: 'Please refresh your access token or reconnect your Amazon account.',
        retryable: true
      };
    }

    // Handle Network Errors
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        type: 'network',
        severity: 'warning',
        resolution: 'Check your internet connection and try again.',
        retryable: true
      };
    }

    // Handle Rate Limiting
    if (error?.message?.includes('429') || error?.status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'API rate limit exceeded',
        type: 'api',
        severity: 'warning',
        resolution: 'Please wait a moment before trying again.',
        retryable: true
      };
    }

    // Handle Server Errors
    if (error?.message?.includes('500') || error?.status === 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Amazon API server error',
        type: 'api',
        severity: 'error',
        resolution: 'This is a temporary Amazon API issue. Please try again later.',
        retryable: true
      };
    }

    // Default error handling
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'An unexpected error occurred',
      type: 'unknown',
      severity: 'error',
      resolution: 'Please try again or contact support if the issue persists.',
      retryable: true
    };
  };

  const errorDetail = parseError(error);

  const getIcon = () => {
    switch (errorDetail.type) {
      case 'permission':
        return <Shield className="h-5 w-5" />;
      case 'token':
        return <Key className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getVariant = () => {
    return errorDetail.severity === 'error' ? 'destructive' : 'default';
  };

  const getBadgeVariant = () => {
    switch (errorDetail.severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSpecificGuidance = () => {
    switch (errorDetail.type) {
      case 'permission':
        return (
          <div className="space-y-3">
            <p className="text-sm font-medium">Required Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Log into your Amazon Advertising Console</li>
              <li>Navigate to the API access section</li>
              <li>Submit your API access request if not already done</li>
              <li>Wait for Amazon's approval (1-2 business days)</li>
              <li>Ensure your account has active campaigns and recent spend</li>
            </ol>
          </div>
        );
      case 'token':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Token issues are usually resolved by refreshing the connection or reconnecting your account.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={`border-l-4 ${errorDetail.severity === 'error' ? 'border-l-destructive' : 'border-l-warning'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getIcon()}
          {context && `${context}: `}Error Detected
          <Badge variant={getBadgeVariant()}>
            {errorDetail.code}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={getVariant()}>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{errorDetail.message}</p>
              {errorDetail.resolution && (
                <p className="text-sm">{errorDetail.resolution}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {getSpecificGuidance()}

        <div className="flex gap-2 pt-2">
          {errorDetail.retryable && onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
          
          {errorDetail.actionUrl && (
            <Button 
              onClick={() => window.open(errorDetail.actionUrl, '_blank')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Get Help
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          {errorDetail.type === 'permission' && (
            <Button 
              onClick={() => window.open('https://advertising.amazon.com/API/docs/en-us/get-started/developer-notes#Approval', '_blank')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              API Approval Guide
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {errorDetail.type === 'permission' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Steps:</strong> Amazon API approval typically takes 1-2 business days. 
              You'll receive an email notification when your access is approved. 
              Make sure your account has active campaigns and advertising spend history.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedErrorHandling;