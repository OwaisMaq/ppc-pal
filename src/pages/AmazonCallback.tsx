import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Wifi, ExternalLink, LogOut, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const AmazonCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAmazonConnections();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Amazon connection...');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [amazonEmail, setAmazonEmail] = useState<string | null>(null);

  useEffect(() => {
    let processed = false;
    
    const processCallback = async () => {
      if (processed) return;
      processed = true;
      
      // Give auth context time to restore session after redirect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Amazon authorization failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization parameters');
        return;
      }

      try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Processing Amazon OAuth callback:`, { 
          code: code.substring(0, 10) + '...', 
          state,
          timestamp 
        });
        const result = await handleOAuthCallback(code, state);
        console.log(`[${timestamp}] OAuth callback result:`, JSON.stringify(result, null, 2));
        
        if (result?.requiresSetup) {
          setStatus('error');
          
          // Capture Amazon email if provided
          if ((result as any).amazonEmail) {
            setAmazonEmail((result as any).amazonEmail);
          }
          
          // Provide specific guidance based on diagnostics if available
          let detailedMessage = result.details || 'Amazon Advertising account setup required.';
          
          const diagnostics = (result as any).diagnostics;
          if (diagnostics?.issueType === 'infrastructure_dns') {
            detailedMessage = 'Network connectivity issues preventing connection to Amazon\'s advertising servers. This appears to be a temporary infrastructure problem.';
          } else if (diagnostics?.issueType === 'no_advertising_account') {
            detailedMessage = 'Successfully connected to Amazon\'s servers, but no advertising profiles were found.';
          } else if (diagnostics?.issueType === 'partial_connectivity') {
            detailedMessage = 'Some Amazon advertising regions are temporarily unavailable. However, no advertising profiles were found in the available regions.';
          }
          
          setMessage(detailedMessage);
          
          // Store diagnostic info for display
          if (diagnostics) {
            setDiagnosticInfo(diagnostics);
          }
          
          return;
        }
        
        if (result?.success) {
          setStatus('success');
          const profileCount = result?.profileCount || 0;
          const syncStarted = result?.syncStarted || false;
          
          if (syncStarted) {
            setMessage(`Amazon account connected! Found ${profileCount} profile(s) and started syncing your advertising data. You can view the data in your dashboard as it loads.`);
          } else {
            setMessage(`Amazon account connected successfully! Found ${profileCount} advertising profile(s). Redirecting to dashboard...`);
          }
          
          // Redirect to dashboard after 3 seconds to give users time to read the message
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          console.log('OAuth callback returned falsy result:', JSON.stringify(result, null, 2));
          setStatus('error');
          setMessage('Failed to connect Amazon account');
        }
      } catch (error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Callback processing error:`, error);
        console.error(`[${timestamp}] Full error details:`, JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
          timestamp
        }, null, 2));
        setStatus('error');
        setMessage(`Connection error: ${error.message || 'Unknown error'}`);
      }
    };

    processCallback();
  }, []); // Empty dependency array to run only once

  const handleSignOutAndRetry = () => {
    // Open Amazon sign-out in a popup, then redirect to settings to retry
    const signOutWindow = window.open('https://www.amazon.com/gp/flex/sign-out.html', '_blank', 'width=600,height=400');
    
    // After a short delay, navigate to settings to retry
    setTimeout(() => {
      if (signOutWindow) {
        signOutWindow.close();
      }
      navigate('/settings?tab=connections');
    }, 2000);
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-success" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-destructive" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'loading':
        return 'text-primary';
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-destructive';
    }
  };

  // Check if this is a "0 profiles found" scenario (successful connection but no profiles)
  const isNoProfilesFound = status === 'error' && 
    diagnosticInfo?.successfulEndpoints > 0 && 
    (diagnosticInfo?.issueType === 'no_advertising_account' || diagnosticInfo?.issueType === 'partial_connectivity');

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getIcon()}
            <span className={getColor()}>
              {status === 'loading' && 'Connecting...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Connection Failed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {/* Show which Amazon account was used */}
          {status === 'error' && amazonEmail && (
            <Alert className="border-primary/20 bg-primary/5">
              <HelpCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>You logged in as:</strong> {amazonEmail}
                <br />
                <span className="text-sm text-muted-foreground">
                  Is this the email associated with your Amazon Advertising account?
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Enhanced troubleshooting for "0 profiles found" */}
          {isNoProfilesFound && (
            <div className="space-y-4">
              <Alert className="border-warning/50 bg-warning/10">
                <Wifi className="h-4 w-4 text-warning" />
                <AlertDescription>
                  <strong className="text-warning">Connection Successful, But No Profiles Found</strong>
                  <p className="text-sm mt-1">
                    We connected to Amazon ({diagnosticInfo.successfulEndpoints} of 3 regions), but found 0 advertising profiles.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Troubleshooting Checklist */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Troubleshooting Checklist</h4>
                
                <div className="space-y-2 text-sm">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox className="mt-0.5" disabled />
                    <span>
                      <strong>Wrong Amazon Account?</strong>
                      <br />
                      <span className="text-muted-foreground">You may have logged into a personal Amazon account instead of your Advertising account.</span>
                    </span>
                  </label>
                  
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox className="mt-0.5" disabled />
                    <span>
                      <strong>API Access Not Enabled?</strong>
                      <br />
                      <span className="text-muted-foreground">API access must be enabled in your Amazon Advertising settings.</span>
                    </span>
                  </label>
                  
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox className="mt-0.5" disabled />
                    <span>
                      <strong>No Active Campaigns?</strong>
                      <br />
                      <span className="text-muted-foreground">You need at least one campaign in Amazon Advertising to connect.</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons for No Profiles Found */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => window.open('https://advertising.amazon.com/', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Check Amazon Advertising Settings
                </Button>
                
                <Button 
                  onClick={handleSignOutAndRetry}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out of Amazon & Try Again
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  variant="ghost"
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Need help? Contact us at support@ppcpal.online
              </p>
            </div>
          )}
          
          {/* Show diagnostic information for other setup issues */}
          {status === 'error' && diagnosticInfo && !isNoProfilesFound && (
            <Alert className="text-left">
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Diagnostics:</strong>
                <br />
                {diagnosticInfo.successfulEndpoints > 0 ? (
                  <>Successfully connected to {diagnosticInfo.successfulEndpoints} of {diagnosticInfo.endpointResults?.length || 3} Amazon regions.</>
                ) : (
                  <>Unable to connect to any Amazon advertising regions.</>
                )}
                {diagnosticInfo.dnsFailureCount > 0 && (
                  <>
                    <br />
                    <strong>Network Issues:</strong> {diagnosticInfo.dnsFailureCount} connection attempts failed due to DNS problems.
                  </>
                )}
                <br />
                <strong>Recommendation:</strong> {diagnosticInfo.recommendation || 'Check your Amazon Advertising account setup and try again.'}
                {diagnosticInfo.userAction && (
                  <>
                    <br />
                    <strong>Next Steps:</strong> {diagnosticInfo.userAction}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Default buttons for non-profile issues */}
          {status === 'error' && !isNoProfilesFound && (
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/settings?tab=connections')} 
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="ghost"
                className="flex-1"
              >
                Return to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to dashboard...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallback;